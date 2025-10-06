import os
import json

MATCHES_DIR = '../matches'
OUTPUT_FILE = '../match_list.js'

def update_match_list():
    try:
        match_files = [f for f in os.listdir(MATCHES_DIR) if f.endswith('.json')]
        
        # Sort files by modification time (newest first)
        match_files.sort(key=lambda f: os.path.getmtime(os.path.join(MATCHES_DIR, f)), reverse=True)

        with open(OUTPUT_FILE, 'w') as f:
            f.write(f"const matchFiles = {json.dumps(match_files)};")
            
        print(f"Successfully updated {OUTPUT_FILE} with {len(match_files)} matches.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    update_match_list()
