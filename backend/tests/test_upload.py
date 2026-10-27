import asyncio
import io
import unittest
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

from app.routes.upload import upload_image


def upload(data, filename, content_type):
    headers = Headers({"content-type": content_type}) if content_type else Headers({})
    file = UploadFile(io.BytesIO(data), filename=filename, headers=headers)
    with patch("app.routes.upload.upload_file_to_s3", return_value="https://s3/x") as s3:
        result = asyncio.run(upload_image(file=file, bucket=None, folder=None, current_user=None))
    return result, s3.call_args.kwargs


def jpeg_bytes(size, orientation=None):
    buf = io.BytesIO()
    img = Image.new("RGB", size, "red")
    if orientation is None:
        img.save(buf, format="JPEG")
    else:
        exif = Image.Exif()
        exif[0x0112] = orientation
        img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


class UploadImageTests(unittest.TestCase):
    def test_exif_orientation_is_applied(self):
        # Orientation 6 = rotate 90° CW to display: stored 40x20 shows as 20x40.
        _, sent = upload(jpeg_bytes((40, 20), orientation=6), "phone.jpg", "image/jpeg")
        self.assertEqual(sent["content_type"], "image/webp")
        self.assertEqual(Image.open(io.BytesIO(sent["file_content"])).size, (20, 40))

    def test_animated_image_is_uploaded_unchanged(self):
        buf = io.BytesIO()
        frames = [Image.new("RGB", (8, 8), c) for c in ("red", "blue")]
        frames[0].save(buf, format="GIF", save_all=True, append_images=frames[1:])
        data = buf.getvalue()

        result, sent = upload(data, "loop.gif", "image/gif")
        self.assertEqual(sent["file_content"], data)
        self.assertEqual(sent["content_type"], "image/gif")
        self.assertEqual(sent["file_name"], "loop.gif")
        self.assertEqual(result["content_type"], "image/gif")

    def test_filename_without_extension_gets_webp_suffix(self):
        result, sent = upload(jpeg_bytes((10, 10)), "image", "image/jpeg")
        self.assertEqual(sent["file_name"], "image.webp")
        self.assertEqual(result["filename"], "image.webp")

    def test_filename_extension_is_replaced(self):
        _, sent = upload(jpeg_bytes((10, 10)), "my.jpg.photo.jpg", "image/jpeg")
        self.assertEqual(sent["file_name"], "my.jpg.photo.webp")

    def test_missing_content_type_is_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            upload(b"data", "blob", None)
        self.assertEqual(ctx.exception.status_code, 415)


if __name__ == "__main__":
    unittest.main()
