# Shared

Code moves here only after two features use it. Shared code cannot import features.

Do not pre-create global `constants` or `types` folders. Use purpose-specific files or `utils` only when shared consumers exist, and prefer inferred types over duplicates.
