import re
import sys

def check_balance(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    content = "".join(lines)
    template_match = re.search(r'<template>(.*)</template>', content, re.DOTALL)
    if not template_match:
        print("No template found")
        return
    
    template = template_match.group(1)
    
    # We need line numbers. Let's find matches with their positions.
    tags = re.finditer(r'<(/?)([a-zA-Z0-9-]+).*?(/?)>', template, re.DOTALL)
    
    stack = []
    
    # helper to get line num from char offset
    def get_line(offset):
        return content[:template_match.start() + offset].count('\n') + 1

    for match in tags:
        is_closing = match.group(1) == '/'
        tag_name = match.group(2)
        is_self_closing = match.group(3) == '/'
        
        line = get_line(match.start())
        
        if is_self_closing or tag_name.lower() in ['img', 'br', 'hr', 'input', 'link', 'meta']:
            continue
            
        if is_closing:
            if not stack:
                print(f"L{line}: Unexpected closing tag </{tag_name}>")
            else:
                last_tag, last_line = stack.pop()
                if last_tag != tag_name:
                    print(f"L{line}: Mismatched tag. Found </{tag_name}>, expected </{last_tag}> (opened at L{last_line})")
                    # Put it back to try to recover? No, just keep going.
        else:
            stack.append((tag_name, line))
            
    if stack:
        print("Unclosed tags remaining:")
        for tag, line in stack:
            print(f"  <{tag}> opened at L{line}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
