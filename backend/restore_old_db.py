import os
import shutil
import subprocess

print("=== Restoring db_temp_backup.sqlite3 to db.sqlite3 ===")
if os.path.exists("db_temp_backup.sqlite3"):
    # Backup current db just in case
    shutil.copy2("db.sqlite3", "db_current_backup_before_restore.sqlite3")
    print("Backed up current db.sqlite3 to db_current_backup_before_restore.sqlite3")
    
    # Restore backup
    shutil.copy2("db_temp_backup.sqlite3", "db.sqlite3")
    print("Restored db_temp_backup.sqlite3 to db.sqlite3 successfully!")
    
    # Run migrations
    print("Running django migrations...")
    res = subprocess.run(["python", "manage.py", "migrate"], capture_output=True, text=True)
    print("STDOUT:")
    print(res.stdout)
    print("STDERR:")
    print(res.stderr)
else:
    print("Error: db_temp_backup.sqlite3 does not exist!")
