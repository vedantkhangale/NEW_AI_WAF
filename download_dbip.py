import urllib.request
import gzip
import shutil
import os
import datetime

# Try to get current year and month for the DB-IP download URL
# URL format: https://download.db-ip.com/free/dbip-city-lite-YYYY-MM.mmdb.gz
now = datetime.datetime.utcnow()
year = now.strftime("%Y")
month = now.strftime("%m")

# Sometimes the current month isn't published yet, fallback to previous month if needed
urls_to_try = [
    f"https://download.db-ip.com/free/dbip-city-lite-{year}-{month}.mmdb.gz",
    f"https://download.db-ip.com/free/dbip-city-lite-{year}-{(int(month)-1):02d}.mmdb.gz",
    f"https://download.db-ip.com/free/dbip-city-lite-2024-02.mmdb.gz" # hard fallback
]

import ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def download_db():
    for url in urls_to_try:
        try:
            print(f"Trying to download: {url}")
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, context=ctx) as response:
                if response.status == 200:
                    print("Download successful, extracting...")
                    with gzip.GzipFile(fileobj=response) as uncompressed:
                        file_content = uncompressed.read()
                    
                    geo_dir = r"d:\REVOX_AI_WAF\geoip"
                    os.makedirs(geo_dir, exist_ok=True)
                    out_path = os.path.join(geo_dir, "GeoLite2-City.mmdb")
                    
                    with open(out_path, 'wb') as f:
                        f.write(file_content)
                    
                    print(f"Successfully saved to {out_path}")
                    return True
        except Exception as e:
            print(f"Failed: {e}")
            continue
    
    print("Could not download any database.")
    return False

if __name__ == "__main__":
    download_db()
