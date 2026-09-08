"""Small regression checks for the fail-closed release validator."""
from build_content import load_bundle, validate_bundle
from check_content import check_publish_state


def fixture(publishable=True, activity_lesson='lesson-1'):
    assets = {
        'assets/audio/guide/welcome.mp3': {
            'reviewStatus': 'approved', 'publishable': True, 'rightsStatus': 'documented', 'rightsEvidence': 'isolated test fixture; not actual approval',
        },
        'assets/characters/guide.webp': {
            'reviewStatus': 'approved', 'publishable': True, 'rightsStatus': 'documented', 'rightsEvidence': 'isolated test fixture; not actual approval',
        },
    }
    return {
        'world_ids': {'faith'},
        'assets': assets, 'hadith_ids': set(),
        'lessons': [{
            'id': 'lesson-1', 'world_id': 'faith', 'status': 'approved',
            'publishable': publishable, 'source_pages': [1], 'objective': 'هدف',
            'segments': [{'text': 'نص', 'audio_asset': 'assets/audio/guide/welcome.mp3',
                          'image_asset': 'assets/characters/guide.webp'}],
            'prerequisites': [], 'questions': [],
        }],
        'activities': [{
            'id': 'activity-1', 'status': 'approved', 'publishable': publishable,
            'source_pages': [1], 'lesson_ids': [activity_lesson], 'type': 'ordering', 'answer': ['first', 'second'],
        }],
        'memorization': [],
    }


def main():
    check_publish_state({'id': 'in-review', 'status': 'in_review', 'publishable': False})
    try:
        check_publish_state({'id': 'fake-approved', 'status': 'approved', 'publishable': True})
    except AssertionError:
        pass
    else:
        raise AssertionError('fake approval accepted')
    assert validate_bundle(fixture(publishable=False))
    assert validate_bundle(fixture(activity_lesson='missing-lesson'))
    unknown = fixture()
    unknown['activities'][0]['type'] = 'unconverted_open_question'
    assert validate_bundle(unknown)
    unreviewed = fixture()
    unreviewed['assets']['assets/audio/guide/welcome.mp3']['reviewStatus'] = 'pending'
    assert validate_bundle(unreviewed)
    cycle = fixture()
    cycle['lessons'][0]['prerequisites'] = ['lesson-1']
    assert validate_bundle(cycle)
    memory_shape = fixture()
    memory_shape['memorization'] = [{
        'id': 'memory-1', 'status': 'approved', 'publishable': True,
        'source_pages': [1], 'title': 'A reviewed item', 'kind': 'quran',
        'quran_ref': {'from_ayah': 1, 'to_ayah': 1},
        'recitation_asset': 'assets/audio/guide/welcome.mp3',
    }]
    assert not validate_bundle(memory_shape)
    duplicate = fixture()
    duplicate['lessons'].append(duplicate['lessons'][0].copy())
    assert validate_bundle(duplicate)
    assert validate_bundle(fixture(), require_complete=True)  # no approval evidence
    assert not validate_bundle(fixture())
    text_only = fixture()
    text_only['lessons'][0]['segments'][0].update(audio_asset=None, image_asset=None)
    assert not validate_bundle(text_only, require_media=False)
    assert validate_bundle(text_only, require_media=True)
    assert not validate_bundle(load_bundle(), require_complete=True, require_media=False)
    print('PASS: content pipeline rejects drafts and missing refs; approved fixture accepted')


if __name__ == '__main__':
    main()
