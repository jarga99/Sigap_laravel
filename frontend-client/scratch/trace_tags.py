import re
import sys

def trace_tags(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    template_match = re.search(r'<template>(.*)</template>', content, re.DOTALL)
    if not template_match:
        print("No template found")
        return
    
    template = template_match.group(1)
    
    # regex that properly handles multiline tags and ignores />
    # <tag ... > or <tag ... /> or </tag>
    # Note: this is still tricky for nested > in attributes, but let's try.
    tag_regex = re.compile(r'<(/?)([a-zA-Z0-9-]+)(.*?)>', re.DOTALL)
    
    stack = []
    
    def get_line(offset):
        return content[:template_match.start() + offset].count('\n') + 1

    for match in tag_regex.finditer(template):
        is_closing = match.group(1) == '/'
        tag_name = match.group(2)
        atts = match.group(3)
        is_self_closing = atts.strip().endswith('/')
        
        line = get_line(match.start())
        
        if tag_name.lower() in ['img', 'br', 'hr', 'input', 'link', 'meta']:
            # Force treat as self-closing
            is_self_closing = True

        if is_self_closing:
            # print(f"L{line}: self-closed <{tag_name} />")
            continue
            
        if is_closing:
            if not stack:
                print(f"L{line}: ERROR! Unexpected closing tag </{tag_name}>")
            else:
                last_tag, last_line = stack.pop()
                if last_tag != tag_name:
                    print(f"L{line}: ERROR! Mismatched tag. Found </{tag_name}>, expected </{last_tag}> (from L{last_line})")
                # else:
                #    print(f"L{line}: closed </{tag_name}> (opens at L{last_line}) - depth {len(stack)}")
        else:
            stack.append((tag_name, line))
            # print(f"L{line}: opened <{tag_name}> - depth {len(stack)}")
            
    if stack:
        print("\nUnclosed tags at end of template:")
        for tag, line in stack:
            print(f"  <{tag}> opened at L{line}")

if __name__ == "__main__":
    trace_tags(sys.argv[1])
