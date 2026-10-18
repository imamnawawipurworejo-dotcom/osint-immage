const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const exifOutput = document.getElementById('exif-output');
const linkOutput = document.getElementById('link-output');

// Handle drag & drop
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#fff'; });
dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = '#00ff80'; });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#00ff80';
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        processFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) processFile(e.target.files[0]);
});

async function processFile(file) {
    results.classList.add('hidden');
    loading.classList.remove('hidden');
    exifOutput.textContent = "Membaca metadata...";
    linkOutput.innerHTML = "";

    // 1. Ekstrak EXIF
    let exifData = "Tidak ada metadata EXIF ditemukan (kemungkinan udah dihapus platform).";
    try {
        const tags = await ExifReader.load(file);
        exifData = "";
        
        if (tags['Make'] || tags['Model']) {
            exifData += `📷 Kamera: ${tags['Make']?.description || ''} ${tags['Model']?.description || ''}\n`;
        }
        if (tags['DateTimeOriginal']) {
            exifData += `📅 Tanggal: ${tags['DateTimeOriginal'].description}\n`;
        }
        if (tags['Software']) {
            exifData += `💻 Software: ${tags['Software'].description}\n`;
        }
        
        // Ekstrak GPS
        if (tags['GPSLatitude'] && tags['GPSLongitude']) {
            const lat = tags['GPSLatitude'].description;
            const lon = tags['GPSLongitude'].description;
            exifData += `\n🔥 GPS DITEMUKAN!\n`;
            exifData += `Latitude: ${lat}\nLongitude: ${lon}\n`;
            exifData += `Maps: https://www.google.com/maps?q=${lat},${lon}\n`;
        }
        
        if (!exifData) exifData = "Metadata EXIF ada, tapi kosong/gak penting.";
        
    } catch (error) {
        console.error(error);
    }
    exifOutput.textContent = exifData;

    // 2. Upload ke tmpfiles.org
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.status === 'success') {
            const directUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            generateLinks(directUrl);
        } else {
            linkOutput.innerHTML = "<p style='color:red'>Gagal upload gambar ke server publik.</p>";
        }
    } catch (err) {
        linkOutput.innerHTML = "<p style='color:red'>Error koneksi ke API upload.</p>";
    }

    loading.classList.add('hidden');
    results.classList.remove('hidden');
}

function generateLinks(url) {
    const encodedUrl = encodeURIComponent(url);
    
    const searchEngines = [
        { name: "Yandex (Paling Akurat)", url: `https://yandex.com/images/search?rpt=imageview&url=${encodedUrl}` },
        { name: "Google Lens", url: `https://lens.google.com/uploadbyurl?url=${encodedUrl}` },
        { name: "Bing Visual Search", url: `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${encodedUrl}` },
        { name: "TinEye", url: `https://tineye.com/search?url=${encodedUrl}` }
    ];

    linkOutput.innerHTML = "";
    searchEngines.forEach(engine => {
        const a = document.createElement('a');
        a.href = engine.url;
        a.target = "_blank";
        a.textContent = `🔍 Cari di ${engine.name}`;
        linkOutput.appendChild(a);
    });
}