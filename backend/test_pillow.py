from PIL import Image
import io

# Create a simple image
img = Image.new('RGB', (2000, 2000), color = 'red')
print(f"Original size: {img.size}")

# Resize
max_width = 1920
if img.width > max_width:
    ratio = max_width / img.width
    new_height = int(img.height * ratio)
    img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
    print(f"Resized to: {img.size}")

# Convert to WebP
output_buffer = io.BytesIO()
img.save(output_buffer, format='WEBP', quality=85, optimize=True)
print(f"WebP size: {len(output_buffer.getvalue())} bytes")
print("Success!")
