"""Check the authored content package: python3 scripts/check_content.py."""
import csv
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content'


def read(name):
    return json.loads((CONTENT / name).read_text())


def main():
    source = read('source/pages.json')
    assert hashlib.sha256((CONTENT / 'source/book.pdf').read_bytes()).hexdigest() == source['sha256']
    assert [p['pdf_page'] for p in source['pages']] == list(range(1, 255))
    data = read('lessons.json')
    lessons = data['lessons']
    activities = read('activities.json')
    memory = read('memorization.json')['items']
    hadiths = read('hadith-index.json')
    original_qa = read('source/questions-answers.json')
    all_items = lessons + activities + memory + hadiths + original_qa + read('remembrances.json')
    ids = [x['id'] for x in all_items]
    assert len(ids) == len(set(ids)), 'Duplicate content identifiers'
    assert all(x['publishable'] is False for x in all_items), 'Draft content marked publishable'
    valid_ids = set(ids)
    world_ids = {w['id'] for w in data['worlds']}
    assert world_ids == {'faith', 'manners', 'conduct', 'worship', 'quran', 'stories', 'memorization'}
    question_ids = []
    for lesson in lessons:
        assert lesson['world_id'] in world_ids
        assert lesson['segments'] and all(s['text'].strip() for s in lesson['segments'])
        assert lesson['questions'] and lesson['objective']
        assert set(lesson['age_instructions']) == {'6-7', '8-10'}
        assert all(1 <= p <= 254 for p in lesson['source_pages'])
        assert set(lesson['prerequisites'] + lesson['original_activity_ids'] + lesson['memorization_ids']) <= valid_ids
        assert lesson['guide_script'] == ' '.join(s['text'] for s in lesson['segments'])
        for q in lesson['questions']:
            question_ids.append(q['id'])
            assert q['prompt'] and q['answer'] and q['explanation']
            if q['type'] == 'multiple_choice':
                assert len(q['options']) == len(set(q['options']))
                assert q['answer'] in q['options']
            elif q['type'] == 'ordering':
                assert sorted(q['items']) == sorted(q['answer'])
                assert len(set(q['items'])) == len(q['items'])
            elif q['type'] == 'matching':
                assert set(q['answer']) == set(q['left'])
                assert set(q['answer'].values()) == set(q['right'])
            else:
                assert q['type'] == 'short_answer' and q['grading'] == 'parent_semantic_review'
    assert len(question_ids) == len(set(question_ids)) == 227
    assert len(lessons) == 111
    for wid in world_ids:
        group = [l for l in lessons if l['world_id'] == wid]
        assert [l['order'] for l in group] == list(range(1, len(group) + 1))
        for i, lesson in enumerate(group):
            assert lesson['prerequisites'] == ([group[i - 1]['id']] if i else [])
    assert len([l for l in lessons if l['world_id'] == 'stories']) == 23
    assert {l['quran_ref']['surah'] for l in lessons if l['world_id'] == 'quran'} == {1, 2, *range(93, 115)}
    assert len(original_qa) == 119
    assert {x['book_number'] for x in original_qa} == {str(n) for n in range(1, 119)} | {'35ب'}
    assert all(x['question'] and x['answer'] and x['raw_question_and_answer'] for x in original_qa)
    assert '2408' in next(x for x in original_qa if x['book_number'] == '111')['raw_question_and_answer']
    numbered = {a['book_number']: a for a in activities if a['book_number'] is not None}
    assert set(numbered) == set(range(1, 45))
    for a in activities:
        assert a['answer'] and a['lesson_ids']
        assert set(a['lesson_ids']) <= valid_ids
    assert numbered[22]['answer_unit'] == 'printed_line'
    assert len(numbered[39]['raw_prompts']) == 6 and len(numbered[39]['answer']) == 5
    assert all(numbered[n]['can_auto_grade'] is False for n in range(21, 45))
    assert numbered[20]['answer'] == {str(n): n / 40 for n in [4000, 5100, 6800, 7400]}
    assert len(memory) == 130
    full_surahs = [m['quran_ref']['surah'] for m in memory if m.get('source_row_type') == 'complete_surah']
    assert len(full_surahs) == 48 and set(full_surahs) == set(range(67, 115))
    for m in memory:
        if 'quran_ref' in m:
            r = m['quran_ref']
            assert 1 <= r['from_ayah'] <= r['to_ayah']
        if m['kind'] == 'hadith':
            assert m['hadith_id'] in valid_ids
    names = [name for m in memory if m['kind'] == 'names' for name in m['names']]
    assert len(names) == 58 and len(set(names)) == 57 and names.count('الولي') == 2
    assert [h['book_number'] for h in hadiths] == list(range(1, 61))
    assert sum(h['required_in_memorization_table'] for h in hadiths) == 37
    with (CONTENT / 'coverage.csv').open(encoding='utf-8-sig', newline='') as f:
        coverage = list(csv.DictReader(f))
    assert [int(row['pdf_page']) for row in coverage] == list(range(1, 255))
    for row in coverage:
        linked = row['lessons'].split(';') if row['lessons'] else []
        expected = [l['id'] for l in lessons if int(row['pdf_page']) in l['source_pages']]
        assert linked == expected
        assert row['classification'] != 'educational' or linked

    with (CONTENT / 'lesson-coverage.csv').open(encoding='utf-8', newline='') as f:
        lesson_coverage = list(csv.DictReader(f))
    assert [row['lesson_id'] for row in lesson_coverage] == [lesson['id'] for lesson in lessons]
    for row, lesson in zip(lesson_coverage, lessons):
        assert row['world_id'] == lesson['world_id']
        assert int(row['order']) == lesson['order']
        assert row['objective'] == lesson['objective']
        assert row['source_pages'] == ';'.join(map(str, lesson['source_pages']))
        assert row['status'] == lesson['status'] == 'draft'
        assert row['publishable'] == str(lesson['publishable']).lower() == 'false'
        for key, column in (
            ('text', 'text_review'),
            ('religious_content', 'religious_content_review'),
            ('age_suitability', 'age_suitability_review'),
            ('audio', 'audio_status'),
            ('images', 'image_status'),
        ):
            assert row[column] == lesson['review_status'][key]

    class DocumentLinks(HTMLParser):
        def handle_starttag(self, tag, attrs):
            values = dict(attrs)
            if tag == 'a' and (href := values.get('href')) and not href.startswith('#'):
                assert (CONTENT / href.split('#')[0]).is_file(), href

    document = (CONTENT / 'index.html').read_text()
    assert 'lang="ar" dir="rtl"' in document
    DocumentLinks().feed(document)
    assert document.count('<details>') == 227 + 119 + 61
    workbook = (CONTENT / 'workbook.md').read_text()
    for lesson in lessons:
        assert workbook.count('### ' + lesson['id'] + ' —') == 1
        assert document.count('id="' + lesson['id'] + '"') == 1
    print('PASS: 254 pages, 111 lessons, 227 new questions, 119 source Q&A, 44 numbered activities, 23 stories, 130 memorization items.')


if __name__ == '__main__':
    main()
