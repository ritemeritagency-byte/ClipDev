const crypto = require("crypto");

const getBunnyLibraryId = () => String(process.env.BUNNY_STREAM_LIBRARY_ID || "").trim();

const getBunnyTokenKey = () => String(process.env.BUNNY_STREAM_TOKEN_KEY || "").trim();

const buildSignedBunnyEmbedUrl = (videoId, expiresAt) => {
  const libraryId = getBunnyLibraryId();
  const tokenKey = getBunnyTokenKey();
  const trimmedVideoId = String(videoId || "").trim();
  const expires = Number(expiresAt || 0);

  if (!libraryId || !tokenKey || !trimmedVideoId || !Number.isFinite(expires) || expires <= 0) {
    return "";
  }

  const token = crypto
    .createHash("sha256")
    .update(`${tokenKey}${trimmedVideoId}${expires}`)
    .digest("hex");

  return `https://iframe.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(
    trimmedVideoId
  )}?token=${token}&expires=${expires}`;
};

module.exports = {
  buildSignedBunnyEmbedUrl,
  getBunnyLibraryId,
  getBunnyTokenKey,
};
