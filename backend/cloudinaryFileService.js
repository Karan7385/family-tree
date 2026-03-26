import cloudinary from "./cloudinaryService.js";

/*
UPLOAD
*/
export const uploadToCloudinary = async (file) => {
  try {

    return {
      url: file.path,
      public_id: file.filename
    };

  } catch (error) {

    throw new Error("Cloudinary upload failed");

  }
};


/*
DELETE
*/
export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {

    throw new Error("Cloudinary delete failed");

  }

};