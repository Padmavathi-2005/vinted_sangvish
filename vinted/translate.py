import json
import os
import sys
import pymongo
from deep_translator import GoogleTranslator
from time import sleep

# Ensure UTF-8 for console output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Configuration
MONGO_URI = "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted"
DB_NAME = "vinted_db"
LOCALES_DIR = "frontend/src/locales"
BASE_LANG_FILE = f"{LOCALES_DIR}/en/translation.json"

def get_active_languages():
    """Fetches active languages from MongoDB."""
    try:
        client = pymongo.MongoClient(MONGO_URI)
        db = client[DB_NAME]
        languages_col = db['languages']
        # Fetch languages where status is active
        langs = list(languages_col.find({"status": 1}))
        
        if not langs:
            langs = list(languages_col.find())
            
        lang_list = []
        for l in langs:
            code = l.get('code') or l.get('iso_code') or l.get('shortcut')
            if code and code != 'en':
                lang_list.append(code.lower())
        
        client.close()
        return list(set(lang_list))
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return ['fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'bn', 'ur', 'tr', 'nl', 'sv', 'pl', 'id', 'vi', 'ta']

def translate_dict(d, target_lang):
    """Recursively translates a dictionary."""
    translated = {}
    for key, value in d.items():
        if isinstance(value, dict):
            translated[key] = translate_dict(value, target_lang)
        else:
            try:
                val_str = str(value)
                print(f"  Translating: {val_str[:30]}...")
                translated[key] = GoogleTranslator(source='en', target=target_lang).translate(val_str)
                sleep(0.1)
            except Exception as e:
                print(f"  Failed to translate '{key}': {e}")
                translated[key] = value
    return translated

def merge_translations(base, target, target_lang):
    """Recursively merges base into target, translating only missing keys."""
    updated = target.copy()
    for key, value in base.items():
        if key not in updated or not updated[key]:
            if isinstance(value, dict):
                print(f"  Adding new category: {key}")
                updated[key] = translate_dict(value, target_lang)
            else:
                val_str = str(value)
                print(f"  Translating missing key: {key} ({val_str[:20]}...)")
                try:
                    updated[key] = GoogleTranslator(source='en', target=target_lang).translate(val_str)
                    sleep(0.1)
                except Exception:
                    updated[key] = value
        elif isinstance(value, dict) and isinstance(updated[key], dict):
            updated[key] = merge_translations(value, updated[key], target_lang)
    return updated

def update_locales():
    if not os.path.exists(BASE_LANG_FILE):
        print(f"Error: Base file {BASE_LANG_FILE} not found!")
        return

    with open(BASE_LANG_FILE, 'r', encoding='utf-8') as f:
        base_translations = json.load(f)

    target_langs = get_active_languages()
    print(f"Found languages in DB: {target_langs}")

    for lang in target_langs:
        print(f"\nProcessing language: {lang}")
        # Structure is locales/code/translation.json
        lang_dir = f"{LOCALES_DIR}/{lang}"
        os.makedirs(lang_dir, exist_ok=True)
        output_file = f"{lang_dir}/translation.json"
        
        if os.path.exists(output_file):
            try:
                with open(output_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                
                print(f"  Checking for missing keys in {lang}...")
                updated_data = merge_translations(base_translations, existing_data, lang)
                
                if updated_data == existing_data:
                    print(f"  All keys present, skipping: {output_file}")
                    continue
                else:
                    print(f"  Saving updated file: {output_file}")
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(updated_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"  Error updating {output_file}: {e}, will re-generate")
        
        if not os.path.exists(output_file) or not os.path.getsize(output_file):
            try:
                translated_data = translate_dict(base_translations, lang)
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(translated_data, f, ensure_ascii=False, indent=2)
                print(f"Successfully generated {output_file}")
            except Exception as e:
                print(f"CRITICAL ERROR processing {lang}: {e}")
                continue

if __name__ == "__main__":
    print("Starting Main App translation sync...")
    update_locales()
    print("\nAll locales synchronized successfully!")
