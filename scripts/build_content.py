"""Build the approved runtime catalog; drafts never enter the output."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content'
SUPPORTED_TYPES = {
    'multiple_choice', 'multiple_select', 'ordering', 'matching', 'short_answer',
    'numeric', 'source_reference_match', 'parent_discussion',
}


def validate_bundle(bundle, require_complete=False, require_media=True):
    lessons = bundle['lessons']
    activities = bundle['activities']
    memory = bundle['memorization']
    assets = bundle.get('assets', {})
    remembrances = bundle.get('remembrances', [])
    errors = []
    lesson_ids = {item.get('id') for item in lessons}
    activity_ids = {item.get('id') for item in activities}
    memory_ids = {item.get('id') for item in memory}
    records = lessons + activities + memory + remembrances
    ids = [item.get('id') for item in records]
    if any(not isinstance(value, str) or not value for value in ids) or len(ids) != len(set(ids)):
        errors.append('missing or duplicate record IDs')
    question_ids = [q.get('id') for lesson in lessons for q in lesson.get('questions', [])]
    if any(not value for value in question_ids) or len(question_ids) != len(set(question_ids)):
        errors.append('missing or duplicate question IDs')
    if require_complete and not lessons:
        errors.append('catalog has no lessons')
    if require_complete:
        for label, batch, expected in (
            ('lessons', lessons, 111),
            ('activities', activities, 61),
            ('memorization', memory, 130),
            ('remembrances', remembrances, 26),
        ):
            if len(batch) != expected:
                errors.append(f'catalog requires {expected} {label}, found {len(batch)}')
        if any(not any(lesson.get('world_id') == world_id for lesson in lessons) for world_id in bundle['world_ids']):
            errors.append('catalog is missing a world')
    visiting = set()
    visited = set()

    def visit(lesson_id):
        if lesson_id in visiting:
            errors.append(f'{lesson_id}: prerequisite cycle')
            return
        if lesson_id in visited:
            return
        visiting.add(lesson_id)
        lesson = next((item for item in lessons if item.get('id') == lesson_id), None)
        if lesson:
            for prerequisite in lesson.get('prerequisites', []):
                visit(prerequisite)
        visiting.remove(lesson_id)
        visited.add(lesson_id)

    for lesson in lessons:
        visit(lesson.get('id'))

    def asset_ok(owner, key, value):
        if not value:
            errors.append(f'{owner}: missing {key}')
            return
        metadata = assets.get(value)
        if not metadata or metadata.get('reviewStatus') != 'approved' or metadata.get('publishable') is not True:
            errors.append(f'{owner}: {key} is not approved/publishable')
        if not metadata or metadata.get('rightsStatus') != 'documented' or not metadata.get('rightsEvidence'):
            errors.append(f'{owner}: {key} lacks documented rights')
        file_path = (ROOT / value).resolve()
        if not file_path.is_relative_to((ROOT / 'assets').resolve()) or not file_path.is_file():
            errors.append(f'{owner}: {key} file missing')
    for item in records:
        label = item.get('id', '<missing id>')
        if item.get('status') != 'approved' or item.get('publishable') is not True:
            errors.append(f'{label}: unapproved or unpublished')
        if require_complete:
            if not item.get('approved_by') or not item.get('approved_at'):
                errors.append(f'{label}: missing approval evidence')
            review = item.get('review_status', {})
            required_reviews = review.values() if require_media else [review.get(key) for key in ('text', 'religious_content', 'age_suitability')]
            if not review or any(value != 'approved' for value in required_reviews):
                errors.append(f'{label}: review gates incomplete')
        pages = item.get('source_pages', [])
        if not pages or not all(isinstance(page, int) and 1 <= page <= 254 for page in pages):
            errors.append(f'{label}: invalid source_pages')
    for lesson in lessons:
        label = lesson.get('id', '<missing id>')
        if lesson.get('world_id') not in bundle['world_ids']:
            errors.append(f'{label}: unknown world')
        if require_complete and require_media and not any(q.get('type') not in {'short_answer', 'parent_discussion'} for q in lesson.get('questions', [])):
            errors.append(f'{label}: requires an automatically graded activity before publication')
        if not lesson.get('objective') or not lesson.get('segments'):
            errors.append(f'{label}: incomplete lesson')
        if any(ref not in lesson_ids for ref in lesson.get('prerequisites', [])):
            errors.append(f'{label}: missing prerequisite')
        if any(ref not in activity_ids for ref in lesson.get('original_activity_ids', [])):
            errors.append(f'{label}: missing activity reference')
        if any(ref not in memory_ids for ref in lesson.get('memorization_ids', [])):
            errors.append(f'{label}: missing memorization reference')
        for segment in lesson.get('segments', []):
            for key in ('audio_asset', 'image_asset'):
                if require_media or segment.get(key):
                    asset_ok(label, key, segment.get(key))
        for question in lesson.get('questions', []):
            qid = question.get('id', f'{label}:question')
            if question.get('type') not in SUPPORTED_TYPES:
                errors.append(f'{qid}: unsupported activity type')
            if question.get('type') == 'short_answer' and question.get('grading') != 'parent_semantic_review':
                errors.append(f'{qid}: open question lacks parent review')
            options = question.get('options', [])
            answer = question.get('answer')
            if question.get('type') in {'multiple_choice', 'multiple_select'}:
                if not options or len(options) != len(set(options)):
                    errors.append(f'{qid}: invalid options')
                answers = [answer] if question.get('type') == 'multiple_choice' else answer or []
                if not answers or not set(answers) <= set(options):
                    errors.append(f'{qid}: answer is outside options')
            elif question.get('type') == 'ordering' and (not answer or sorted(question.get('items', [])) != sorted(answer) or len(set(answer)) != len(answer)):
                errors.append(f'{qid}: invalid ordering answer')
            elif question.get('type') == 'matching' and (not isinstance(answer, dict) or set(answer) != set(question.get('left', [])) or set(answer.values()) != set(question.get('right', []))):
                errors.append(f'{qid}: invalid matching answer')
    for activity in activities:
        label = activity.get('id', '<missing id>')
        if any(ref not in lesson_ids for ref in activity.get('lesson_ids', [])):
            errors.append(f'{label}: missing lesson reference')
        if activity.get('answer') is None:
            errors.append(f'{label}: missing activity answer')
        if activity.get('type') not in SUPPORTED_TYPES:
            errors.append(f'{label}: unsupported activity type')
        if activity.get('type') == 'parent_discussion' and activity.get('grading') != 'parent_review':
            errors.append(f'{label}: parent discussion lacks parent review')
    for item in memory:
        if require_complete and require_media and (not isinstance(item.get('text'), str) or not item['text'].strip()):
            errors.append(f"{item.get('id', '<missing id>')}: missing reviewed display text for memorization")
        if not item.get('title'):
            errors.append(f"{item.get('id', '<missing id>')}: missing memorization title")
        if item.get('kind') == 'quran' and not item.get('quran_ref'):
            errors.append(f"{item.get('id', '<missing id>')}: missing Quran reference")
        if item.get('kind') == 'names' and not item.get('names'):
            errors.append(f"{item.get('id', '<missing id>')}: missing names")
        if require_media and item.get('kind') in {'quran', 'hadith'} and not item.get('recitation_asset'):
            errors.append(f"{item.get('id', '<missing id>')}: missing recitation asset")
        if item.get('kind') in {'quran', 'hadith'} and (require_media or item.get('recitation_asset')):
            asset_ok(item.get('id', '<missing id>'), 'recitation_asset', item.get('recitation_asset'))
        if item.get('kind') == 'hadith' and item.get('hadith_id') not in bundle.get('hadith_ids', set()):
            errors.append(f"{item.get('id', '<missing id>')}: missing hadith reference")
    return errors


def load_bundle():
    lessons_data = json.loads((CONTENT / 'lessons.json').read_text())
    return {
        'schema_version': 1,
        'world_ids': {world['id'] for world in lessons_data['worlds']},
        'worlds': lessons_data['worlds'],
        'lessons': lessons_data['lessons'],
        'activities': json.loads((CONTENT / 'activities.json').read_text()),
        'memorization': json.loads((CONTENT / 'memorization.json').read_text())['items'],
        'hadith_ids': {item['id'] for item in json.loads((CONTENT / 'hadith-index.json').read_text())},
        'remembrances': json.loads((CONTENT / 'remembrances.json').read_text()),
        'assets': {'assets/' + item['path']: item for item in json.loads((ROOT / 'assets/manifest.json').read_text())['assets']},
    }


def build(output, require_media=False):
    bundle = load_bundle()
    errors = validate_bundle(bundle, require_complete=True, require_media=require_media)
    if errors:
        raise SystemExit('Release blocked:\n' + '\n'.join(errors[:30]))
    output.write_text(json.dumps({key: bundle[key] for key in ('schema_version', 'worlds', 'lessons', 'activities', 'memorization', 'remembrances')}, ensure_ascii=False, indent=2) + '\n')
    print(f'Built approved catalog: {len(bundle["lessons"])} lessons')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Build the approved content catalog.')
    parser.add_argument('--output', type=Path, default=CONTENT / 'catalog.json')
    parser.add_argument('--require-media', action='store_true', help='Require full narration, teaching images and recitations in addition to reviewed text.')
    args = parser.parse_args()
    build(args.output, require_media=args.require_media)
