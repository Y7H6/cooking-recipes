# Windows Process Diagnosis

目的:
ポート競合やFastAPI多重起動を調査する

手順:

1. netstat -ano
2. Get-NetTCPConnection
3. tasklist
4. Get-Process
5. Get-CimInstance Win32_Process

確認項目:

- PID
- ParentProcessId
- Listen Port
- python.exe
- uvicorn
- multiprocessing.spawn

判定:

- 親子プロセス
- 孤児プロセス
- zombie
- reload監視プロセス