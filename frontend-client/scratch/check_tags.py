import re
import sys

def check_balance(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    # Extract template section
    template_match = re.search(r'<template>(.*)</template>', content, re.DOTALL)
    if not template_match:
        print("No template section found")
        return
    
    template = template_match.group(1)
    
    # Simple regex for tags
    # <tag ... /> or <tag ... > or </tag>
    tags = re.findall(r'<(/?)([a-zA-Z0-9-]+).*?(/?)>', template)
    
    stack = []
    for is_closing, tag_name, is_self_closing in tags:
        if is_self_closing == '/' or tag_name.lower() in ['img', 'br', 'hr', 'input', 'link', 'meta']: # Self-closing
            continue
        
        if is_closing:
            if not stack:
                print(f"Error: Unexpected closing tag </{tag_name}>")
            else:
                last_open = stack.pop()
                if last_open != tag_name:
                    print(f"Error: Mismatched tag. Expected </{last_open}>, found </{tag_name}>")
        else:
            stack.append(tag_name)
    
    if stack:
        print(f"Error: Unclosed tags: {stack}")
    else:
        print("Template tags are balanced!")

if __name__ == "__main__":
    check_balance(sys.argv[1])
