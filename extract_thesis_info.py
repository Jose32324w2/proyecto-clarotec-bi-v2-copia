
import re

file_path = r"C:\Users\josem\Documents\GitHub\proyecto-clarotec\docs\Tesis para enviar EN DESARROLLO.htm"

def clean_html(raw_html):
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, ' ', raw_html)
    return cleantext

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# simple keywords map
keywords = {
    "ISO": ["ISO", "27001", "9001"],
    "OWASP": ["OWASP", "Top 10", "Vulnerabil"],
    "Leyes": ["Ley", "19.628", "Legisla", "Normativa"],
    "Cronograma": ["Cronograma", "Gantt", "Planifi"],
    "Gestion": ["Scrum", "Agile", "Metodolog", "Sprints"],
    "POO": ["POO", "Programacion orientada a objetos", "Polimorfismo", "Herencia"],
    "Herramientas": ["Jira", "GitHub", "VSCode", "Trello", "Slack"],
    "Tecnologias": ["Django", "React", "AWS", "PostgreSQL", "Docker"],
    "Funcionalidades": ["Funcionalidad", "Modulo", "Requerimiento"],
    "Cliente": ["Cliente", "Solicitud", "Reuni"],
    "Encriptacion": ["Encripta", "SHA256", "Hashing", "Cifrado", "Seguridad"]
}

text_content = clean_html(content)

# Normalize whitespace
text_content = " ".join(text_content.split())

results = {}


with open('extracted_info.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total extracted text length: {len(text_content)} chars\n")
    for category, keys in keywords.items():
        f.write(f"\n--- Searching for {category} ---\n")
        found_count = 0
        for key in keys:
            for match in re.finditer(key, text_content, re.IGNORECASE):
                if found_count > 5: break 
                start = max(0, match.start() - 500)
                end = min(len(text_content), match.end() + 500)
                context = text_content[start:end]
                f.write(f"Match '{key}': ...{context}...\n")
                found_count += 1

