# VHS tape file — run with: vhs demo.tape
# Produces docs/assets/demo.gif
# Install VHS: https://github.com/charmbracelet/vhs

Output docs/assets/demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 40ms

# Title moment
Type "# Convert a PDF to clean Markdown"
Enter
Sleep 1s

# Single file conversion
Type "pdf-to-markdown report.pdf"
Enter
Sleep 2.5s

# Show a glimpse of the output
Type "head -30 report.md"
Enter
Sleep 3s

# Batch conversion
Type "# Batch convert an entire directory"
Enter
Sleep 500ms
Type "pdf-to-markdown ./contracts ./output"
Enter
Sleep 2s

# Show results
Type "ls output/"
Enter
Sleep 2s

# Done
Sleep 1s
