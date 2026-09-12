/* Shared private image uploader (portal pages). Posts to upload-media.php
   with private=1 so files stay out of the public gallery. Calls back
   with the server URL, or null when unavailable (caller keeps data URL). */
function rhDataUrlToBlob(dataUrl) {
  var parts = String(dataUrl).split(',');
  var mime = ((parts[0].match(/:(.*?);/) || [])[1]) || 'image/png';
  var bin = atob(parts[1] || '');
  var arr = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return { blob: new Blob([arr], { type: mime }), mime: mime };
}

function rhUploadImage(dataUrl, fname, cb) {
  if (!window.fetch || !window.FormData || !dataUrl || dataUrl.indexOf('data:image') !== 0) { cb(null); return; }
  var parts;
  try { parts = rhDataUrlToBlob(dataUrl); }
  catch (e) { cb(null); return; }
  var ext = 'png';
  if (parts.mime === 'image/jpeg') ext = 'jpg';
  else if (parts.mime === 'image/gif') ext = 'gif';
  else if (parts.mime === 'image/webp') ext = 'webp';
  var fd = new FormData();
  try { fd.append('file', parts.blob, fname + '.' + ext); }
  catch (e) { cb(null); return; }
  fd.append('private', '1');
  fetch('upload-media.php', { method: 'POST', body: fd }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function(d) {
    cb(d && d.url ? d.url : null);
  }).catch(function() { cb(null); });
}
