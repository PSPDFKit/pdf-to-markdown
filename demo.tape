# VHS tape file — run with: vhs demo.tape
# Produces docs/assets/demo.gif
# Install VHS: https://github.com/charmbracelet/vhs

Output docs/assets/demo.gif

Set Shell "bash"
Set FontSize 15
Set Width 920
Set Height 540
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 50ms

# Convert a single PDF to Markdown
Type "pdf-to-markdown sample-report.pdf"
Enter
Sleep 4s

# Save output to a file
Type "pdf-to-markdown sample-report.pdf report.md"
Enter
Sleep 3s

# Confirm the file was written
Type "head -20 report.md"
Enter
Sleep 3s

# Done
Sleep 1s
