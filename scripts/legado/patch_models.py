with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace(
    '"gemini-3.6-flash",',
    '"gemini-2.5-flash",\n    "gemini-3.5-flash-lite",'
)

with open('server.ts', 'w') as f:
    f.write(content)
