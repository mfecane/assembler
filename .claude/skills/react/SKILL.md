---
name: react
description: Use when working with tsx templates.
---

# React

- Ensure root-level elements of components for large menus/panels/headers are identified with data-id property even if it is not used for styling of dom queries. It is needed for LLM context and ease of inspection via browser dev tools.

- Collapse long-ass className's containing multiple tailwind classes to construction like this:

```
className = cn(
'class1 class2 class3',
'class4 class5 class6',
)
```

with line length not exceeding 120 characters
