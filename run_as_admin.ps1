# Run the setup script as administrator
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "setup_postgres_noprompt.bat" -Verb RunAs -Wait
