    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    import { getDatabase, ref, set, push, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCKcegYgu1v3zH6G3wNivJCt2-p23XrRuw",
    authDomain: "drive-1c329.firebaseapp.com",
    databaseURL: "https://drive-1c329-default-rtdb.firebaseio.com",
    projectId: "drive-1c329",
    storageBucket: "drive-1c329.appspot.com",
    messagingSenderId: "730477611624",
    appId: "1:730477611624:web:95f90d5753a7a28ebb89dd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

    let folderPassword = null; let allGlobalFolders = []; let pendingFolderNav = null; let curUser=null, myUID="", selFiles=new Set(), curFold='root', foldPath=[{id:'root',name:'Home'}]; let popupCb = null; let currentMediaList = []; let currentMediaIndex = 0; let filesListenerAttached = false; let dbSnapshot = null; let movingFilesSet = new Set(); let isChatOpen = false;

    window.openPopup = (type, msg, status='info', cb=null) => {
        const p=document.getElementById('global-popup'), i=document.getElementById('pop-icon'), t=document.getElementById('pop-title'), m=document.getElementById('pop-msg'), o=document.getElementById('pop-ok'), c=document.getElementById('pop-cancel');
        popupCb = cb; t.innerText = type==='confirm'?"Confirmation":(status==='success'?"Success":"Alert"); m.innerText = msg;
        i.className = `fas popup-icon ${status==='success'?'fa-check-circle pop-success':(status==='error'?'fa-times-circle pop-error':'fa-info-circle pop-info')}`;
        c.style.display=type==='confirm'?'inline-block':'none'; o.onclick=()=>{ p.style.display='none'; if(popupCb) popupCb(); }; c.onclick=()=>{ p.style.display='none'; }; p.style.display='flex';
    };

    window.toggleAuth = (mode) => { document.getElementById('login-form').style.display = 'none'; document.getElementById('signup-form').style.display = 'none'; document.getElementById('forgot-form').style.display = 'none'; if (mode === 'login') document.getElementById('login-form').style.display = 'block'; else if (mode === 'signup') document.getElementById('signup-form').style.display = 'block'; else if (mode === 'forgot') document.getElementById('forgot-form').style.display = 'block'; };
    window.openModal=id=>document.getElementById(id).style.display='flex'; window.closeModal=id=>document.getElementById(id).style.display='none';

    onAuthStateChanged(auth, u=>{ if(u){ curUser=u; init(); } else{ document.getElementById('auth-screen').style.display='flex'; document.getElementById('dashboard').style.display='none'; } });
    
    window.login = async () => { const email = document.getElementById('l-email').value, pass = document.getElementById('l-pass').value; try { await signInWithEmailAndPassword(auth, email, pass); } catch (e) { window.openPopup('alert', parseError(e.message), 'error'); } };
    window.sendMainPasswordReset = async () => { const email = document.getElementById('f-email-direct').value; if(!email) return window.openPopup('alert', 'Please enter your Gmail', 'error'); try { await sendPasswordResetEmail(auth, email); window.openPopup('success', 'Reset link sent to your Gmail!', 'success'); window.toggleAuth('login'); } catch(e) { window.openPopup('alert', parseError(e.message), 'error'); } };

    async function initCamera(videoElementId) { const video = document.getElementById(videoElementId); if(video.srcObject) video.srcObject.getTracks().forEach(t => t.stop()); try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }); video.srcObject = stream; video.onloadedmetadata = () => video.play(); return true; } catch (err) { return false; } }
    window.startCam = async () => { const name = document.getElementById('r-name').value, email = document.getElementById('r-email').value, pass = document.getElementById('r-pass').value; if (!name || !email || !pass) return window.openPopup('alert', 'Fill all fields', 'error'); document.getElementById('s-inputs').style.display = 'none'; document.getElementById('cam-box').style.display = 'block'; const success = await initCamera('webcam'); if(success) analyzeFace(document.getElementById('webcam'), name, email, pass); };
    async function analyzeFace(video, name, email, pass) { const canvas = document.getElementById('scan-canvas'); const ctx = canvas.getContext('2d'); const status = document.getElementById('scan-status'); let progress = 0; const interval = setInterval(async () => { if (video.readyState === video.HAVE_ENOUGH_DATA) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; ctx.drawImage(video, 0, 0, canvas.width, canvas.height); progress += 2; status.innerText = "Scanning..."; if (progress >= 100) { clearInterval(interval); status.innerText = "Uploading..."; await uploadFace(canvas, name, email, pass); } } }, 50); }
    async function uploadFace(canvas, name, email, pass) { const blob = await (await fetch(canvas.toDataURL('image/jpeg'))).blob(); const fd = new FormData(); fd.append('file', blob); fd.append('upload_preset', 'MiniDrive'); fd.append('folder', 'faces'); try { const res = await fetch('https://api.cloudinary.com/v1_1/dhfbdy7rq/upload', { method: 'POST', body: fd }); const data = await res.json(); createAcc(data.secure_url, name, email, pass); } catch (e) { window.openPopup('alert', 'Face upload failed', 'error'); } }
    async function createAcc(faceUrl, name, email, pass) { try { const cred = await createUserWithEmailAndPassword(auth, email, pass); const uid = cred.user.uid; const customUID = `TD${Math.floor(Math.random() * 90000000 + 10000000)}${name.slice(0, 2).toUpperCase()}`; await set(ref(db, `users/${uid}`), { name, email, faceUrl, customUID, storageLimitGB: 15, usedStorageBytes: 0 }); await set(ref(db, `uid_map/${customUID}`), uid); location.reload(); } catch (e) { window.openPopup('alert', parseError(e.message), 'error'); } }

    function init() { 
        document.getElementById('auth-screen').style.display = 'none'; document.getElementById('dashboard').style.display = 'flex'; 
        onValue(ref(db, `users/${curUser.uid}`), async (snapshot) => { 
            if (!snapshot.exists()) return; const u = snapshot.val(); if (!u.customUID) return; 
            myUID = u.customUID; document.getElementById('uid-disp').innerText = "UID: " + myUID; 
            const limit = u.storageLimitGB ?? 15; const usedGB = (u.usedStorageBytes ?? 0) / (1024 ** 3); 
            document.getElementById('store-txt').innerText = `${usedGB.toFixed(2)} / ${limit} GB`; 
            document.getElementById('store-bar').style.width = Math.min((usedGB / limit) * 100, 100) + "%"; 
            folderPassword = u.folderPassword || null; 
        }); 
        loadFiles(); listenToChat(); listenNotifs();
    }
    
    function loadFiles(){ if(filesListenerAttached) return; filesListenerAttached = true; onValue(ref(db,`users/${curUser.uid}/files`), snapshot=>{ dbSnapshot = snapshot; renderFiles(snapshot); }); }
    function renderFiles(snapshot){ const g = document.getElementById('file-grid'); g.innerHTML = ""; if(!snapshot) return; const allFiles = []; snapshot.forEach(c=>{ allFiles.push({ k:c.key, ...c.val() }); }); allGlobalFolders = allFiles.filter(f => f.type === 'folder'); const visibleFiles = allFiles.filter(f => (f.parentId ?? 'root') === curFold); visibleFiles.sort((a,b)=>{ if(a.type==='folder' && b.type!=='folder') return -1; if(a.type!=='folder' && b.type==='folder') return 1; return (b.createdAt||0)-(a.createdAt||0); }); currentMediaList = visibleFiles.filter(f => f.type==='image' || f.type==='video'); visibleFiles.forEach(f=>{ const el = document.createElement('div'); el.className = "file-card"; let thumb = ""; let lockBadge = f.isLocked ? `<i class="fas fa-lock lock-badge"></i>` : ""; if(f.type === 'folder'){ thumb = `<i class="fas fa-folder file-icon" style="color:#f7b731"></i> ${lockBadge}`; } else if(f.type === 'image'){ thumb = `<img src="${f.url}" class="file-thumb">`; } else if(f.type === 'video'){ thumb = `<img src="${f.url.replace('/video/upload/', '/video/upload/so_1/').replace('.mp4', '.jpg')}" class="file-thumb"><div class="type-badge">VIDEO</div>`; } else{ thumb = `<i class="fas fa-file file-icon"></i>`; } el.innerHTML = `<div class="thumb-wrapper">${thumb}</div><span class="file-name">${f.name}</span>`; let pressTimer = null; let longPressed = false; let isScrolling = false; let startX = 0, startY = 0; el.addEventListener("touchstart", (e) => { longPressed = false; isScrolling = false; startX = e.touches[0].clientX; startY = e.touches[0].clientY; pressTimer = setTimeout(() => { if(!isScrolling && !movingFilesSet.size) { longPressed = true; togSel(f.k, el); navigator.vibrate?.(40); } }, 500); }); el.addEventListener("touchmove", (e) => { let moveX = Math.abs(e.touches[0].clientX - startX); let moveY = Math.abs(e.touches[0].clientY - startY); if (moveX > 10 || moveY > 10) { isScrolling = true; clearTimeout(pressTimer); } }); el.addEventListener("touchend", () => { clearTimeout(pressTimer); if(longPressed || isScrolling) return; if(selFiles.size > 0){ togSel(f.k, el); return; } if (f.type === 'folder') window.attemptNav(f.k, f.name, f.isLocked); else if (f.type === 'image') viewPhoto(f.url, f.k); else if (f.type === 'video') playVideoInApp(f.url, f.k); else window.open(f.url); }); g.appendChild(el); }); }

    window.uploadFilesXHR = async (input) => { const files = input.files; if (!files || files.length === 0) return; window.openPopup('info', `Uploading ${files.length} files...`, 'info'); const grid = document.getElementById('file-grid'); for (let i = 0; i < files.length; i++) { const file = files[i]; const tempId = `up-${Date.now()}-${i}`; const tempCard = document.createElement('div'); tempCard.className = "file-card"; tempCard.id = tempId; tempCard.innerHTML = `<div class="thumb-wrapper" style="background:#57606f; color:white;"><small id="p-${tempId}" style="font-weight:bold;">0%</small></div><span class="file-name">${file.name}</span>`; grid.prepend(tempCard); try { let uploadedUrl = await uploadNormal(file, tempId); let type = 'file'; if(file.type.startsWith('image')) type='image'; else if(file.type.startsWith('video')) type='video'; await set(ref(db, `users/${curUser.uid}/files/f_${Date.now()}_${Math.random().toString(36).substr(2,5)}`), { name: file.name, url: uploadedUrl, type: type, size: file.size, parentId: curFold, createdAt: Date.now() }); const uRef = ref(db, `users/${curUser.uid}`); const s = await get(uRef); if(s.exists()) update(uRef, { usedStorageBytes: (s.val().usedStorageBytes||0) + file.size }); document.getElementById(tempId).remove(); } catch (e) { document.getElementById(`p-${tempId}`).innerText = "Failed"; } } input.value = ""; };
    function uploadNormal(file, tempId) { return new Promise((resolve, reject) => { const xhr = new XMLHttpRequest(); const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", "MiniDrive"); fd.append("resource_type", "auto"); xhr.open("POST", `https://api.cloudinary.com/v1_1/dhfbdy7rq/upload`, true); xhr.timeout = 0; xhr.upload.onprogress = (e) => { if (e.lengthComputable) { const pEl = document.getElementById(`p-${tempId}`); if(pEl) pEl.innerText = Math.round((e.loaded / e.total) * 100) + "%"; } }; xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).secure_url); else reject(); }; xhr.onerror = () => reject(); xhr.send(fd); }); }

    // ==========================================
    // NOTIFICATION & SHARE SYSTEM (RESTORED)
    // ==========================================
    
    function listenNotifs() {
        onValue(ref(db, `users/${curUser.uid}/notifications`), snap => {
            const dot = document.getElementById('notif-dot');
            if(snap.exists()) {
                dot.style.display = 'flex';
                dot.innerText = snap.size;
            } else {
                dot.style.display = 'none';
            }
        });
    }

    window.shareFiles = async () => {
        const rUid = document.getElementById('share-uid').value.trim();
        if(!rUid) return window.openPopup('alert', 'Please enter Receiver UID', 'error');
        try {
            const snap = await get(ref(db, `uid_map/${rUid}`));
            if(!snap.exists()) return window.openPopup('alert', 'User not found! Check UID.', 'error');
            
            const realUid = snap.val();
            if(realUid === curUser.uid) return window.openPopup('alert', 'You cannot share files to yourself!', 'error');
            
            let filesToShare = [];
            for(let k of selFiles) {
                const fSnap = await get(ref(db, `users/${curUser.uid}/files/${k}`));
                if(fSnap.exists()) filesToShare.push(fSnap.val());
            }
            
            await push(ref(db, `users/${realUid}/notifications`), {
                senderName: myUID,
                items: filesToShare,
                time: Date.now()
            });
            
            window.closeModal('share-modal');
            window.openPopup('success', 'Files sent successfully!', 'success');
            
            selFiles.clear();
            document.getElementById('sel-actions').style.display = 'none';
            renderFiles(dbSnapshot);
            document.getElementById('share-uid').value = '';
        } catch(e) { window.openPopup('alert', 'Sharing failed.', 'error'); }
    };

    window.loadNotifs = async () => {
        const list = document.getElementById('notif-list');
        list.innerHTML = '<p style="text-align:center;font-size:12px;">Loading...</p>';
        
        const snap = await get(ref(db, `users/${curUser.uid}/notifications`));
        if(!snap.exists()) { list.innerHTML = '<p style="text-align:center;font-size:12px;color:#777;">Inbox is empty.</p>'; return; }
        
        list.innerHTML = '';
        
        // Generate folder options for the dropdown
        let folderOpts = `<option value="root">/ Home</option>`;
        allGlobalFolders.forEach(f => {
            folderOpts += `<option value="${f.k}">📁 ${f.name}</option>`;
        });

        snap.forEach(child => {
            const n = child.val();
            const dateStr = new Date(n.time).toLocaleString();
            list.innerHTML += `
                <div style="background:var(--bg); padding:15px; border-radius:15px; box-shadow:inset 3px 3px 6px #a3b1c6, inset -3px -3px 6px #ffffff; font-size:13px; color:var(--text);">
                    <div style="margin-bottom:8px;"><b>From:</b> <span style="color:var(--accent);">${n.senderName}</span></div>
                    <div style="margin-bottom:8px;"><b>Files:</b> ${n.items.length} items</div>
                    <div style="margin-bottom:8px; font-size:10px; color:#888;">${dateStr}</div>
                    
                    <p style="font-size:11px; font-weight:bold; margin-top:10px;">Select folder to save:</p>
                    <select id="sel-fold-${child.key}" class="neu-inset neu-input" style="padding:10px; margin-top:5px; margin-bottom:15px; font-size:12px; width:100%;">
                        ${folderOpts}
                    </select>
                    
                    <div style="display:flex; gap:10px;">
                        <button class="neu-btn" style="flex:1; padding:10px; font-size:12px;" onclick="window.acceptShare('${child.key}')">Save</button>
                        <button class="neu-btn" style="flex:1; padding:10px; font-size:12px; color:var(--danger);" onclick="window.deleteNotif('${child.key}')">Delete</button>
                    </div>
                </div>
            `;
        });
    };

    window.acceptShare = async (notifId) => {
        const targetFolder = document.getElementById(`sel-fold-${notifId}`).value;
        try {
            const nSnap = await get(ref(db, `users/${curUser.uid}/notifications/${notifId}`));
            if(!nSnap.exists()) return;
            const items = nSnap.val().items;
            let totalSize = 0;
            
            for(let item of items) {
                const newItem = {...item, parentId: targetFolder, createdAt: Date.now()};
                delete newItem.k; 
                await set(ref(db, `users/${curUser.uid}/files/f_${Date.now()}_${Math.random().toString(36).substr(2,5)}`), newItem);
                if(item.size) totalSize += item.size;
            }
            
            const uRef = ref(db, `users/${curUser.uid}`);
            const uSnap = await get(uRef);
            if(uSnap.exists()) {
                await update(uRef, { usedStorageBytes: (uSnap.val().usedStorageBytes||0) + totalSize });
            }
            
            await remove(ref(db, `users/${curUser.uid}/notifications/${notifId}`));
            window.loadNotifs(); 
            window.openPopup('success', 'Files saved to folder successfully!', 'success');
        } catch(e) { window.openPopup('alert', 'Error saving files.', 'error'); }
    };

    window.deleteNotif = async (notifId) => {
        await remove(ref(db, `users/${curUser.uid}/notifications/${notifId}`));
        window.loadNotifs();
    };

    // ==========================================

    function listenToChat() {
        onValue(ref(db, `users/${curUser.uid}/chat`), snap => {
            const msgsBox = document.getElementById('chat-msgs'); msgsBox.innerHTML = ''; let unread = 0;
            snap.forEach(child => { const msg = child.val(); const div = document.createElement('div'); div.className = `msg ${msg.sender === 'user' ? 'msg-me' : 'msg-admin'}`; div.innerText = msg.text; msgsBox.appendChild(div); if (msg.sender === 'admin' && !msg.read) unread++; });
            msgsBox.scrollTop = msgsBox.scrollHeight; const badge = document.getElementById('chat-badge');
            if (!isChatOpen && unread > 0) { badge.style.display = 'flex'; badge.innerText = unread; } else { badge.style.display = 'none'; }
        });
    }

    window.openChat = () => { isChatOpen = true; document.getElementById('chat-badge').style.display = 'none'; window.openModal('chat-modal'); get(ref(db, `users/${curUser.uid}/chat`)).then(snap => { const updates = {}; snap.forEach(c => { if (c.val().sender === 'admin' && !c.val().read) { updates[`users/${curUser.uid}/chat/${c.key}/read`] = true; } }); if (Object.keys(updates).length > 0) update(ref(db), updates); }); };
    window.closeChat = () => { isChatOpen = false; window.closeModal('chat-modal'); };
    window.sendChat = async () => { const input = document.getElementById('chat-in'); const text = input.value.trim(); if(!text) return; input.value = ''; await push(ref(db, `users/${curUser.uid}/chat`), { sender: 'user', text: text, time: Date.now() }); };

    window.startMoveMode = () => { if (selFiles.size === 0) return; movingFilesSet = new Set(selFiles); selFiles.clear(); document.getElementById('sel-actions').style.display = 'none'; document.getElementById('main-fabs').style.display = 'none'; document.getElementById('move-action-bar').style.display = 'flex'; document.getElementById('move-txt').innerText = `Moving ${movingFilesSet.size} items`; window.nav('root', 'Home'); };
    window.confirmMoveHere = async () => { if (movingFilesSet.has(curFold)) return window.openPopup('alert', 'Cannot move a folder inside itself!', 'error'); try { const updates = {}; movingFilesSet.forEach(fileId => { updates[`users/${curUser.uid}/files/${fileId}/parentId`] = curFold; }); await update(ref(db), updates); window.openPopup('success', 'Files moved!', 'success'); } catch (e) { window.openPopup('alert', 'Move failed!', 'error'); } window.cancelMove(); };
    window.cancelMove = () => { movingFilesSet.clear(); document.getElementById('move-action-bar').style.display = 'none'; document.getElementById('main-fabs').style.display = 'flex'; renderFiles(dbSnapshot); };

    window.openSettings = () => { window.openModal('settings-modal'); window.showSettingsView('main'); };
    window.showSettingsView = (viewName) => { document.getElementById('settings-main-view').style.display = 'none'; document.getElementById('settings-lock-view').style.display = 'none'; document.getElementById('settings-password-view').style.display = 'none'; document.getElementById('settings-admin-view').style.display = 'none'; if (viewName === 'main') { document.getElementById('settings-main-view').style.display = 'block'; } else if (viewName === 'lock') { document.getElementById('settings-lock-view').style.display = 'block'; document.getElementById('new-lock-pass').value = ''; document.getElementById('conf-lock-pass').value = ''; document.getElementById('verify-lock-pass').value = ''; document.getElementById('change-lock-pass').value = ''; if (!folderPassword) { document.getElementById('lock-setup-view').style.display = 'block'; document.getElementById('lock-verify-view').style.display = 'none'; document.getElementById('lock-manage-view').style.display = 'none'; } else { document.getElementById('lock-setup-view').style.display = 'none'; document.getElementById('lock-verify-view').style.display = 'block'; document.getElementById('lock-manage-view').style.display = 'none'; } } else if (viewName === 'password') { document.getElementById('settings-password-view').style.display = 'block'; document.getElementById('old-login-pass').value = ''; document.getElementById('new-login-pass').value = ''; document.getElementById('conf-login-pass').value = ''; } else if (viewName === 'admin') { document.getElementById('settings-admin-view').style.display = 'block'; } };
    window.setupNewLock = async () => { const p1 = document.getElementById('new-lock-pass').value, p2 = document.getElementById('conf-lock-pass').value; if(!p1 || p1 !== p2) return window.openPopup('alert', 'Passwords do not match!', 'error'); await update(ref(db, `users/${curUser.uid}`), { folderPassword: p1 }); folderPassword = p1; window.openPopup('success', 'Lock Setup Successful!', 'success'); window.showSettingsView('lock'); };
    window.verifyLockSettings = () => { const p = document.getElementById('verify-lock-pass').value; if(p === folderPassword) { document.getElementById('lock-verify-view').style.display = 'none'; document.getElementById('lock-manage-view').style.display = 'block'; window.loadLockFolderList(); } else window.openPopup('alert', 'Wrong Password!', 'error'); };
    window.loadLockFolderList = () => { const list = document.getElementById('lock-folder-list'); list.innerHTML = ''; if(allGlobalFolders.length === 0) return list.innerHTML = "No folders found."; allGlobalFolders.forEach(f => { list.innerHTML += `<div class="lock-folder-item"><input type="checkbox" id="chk-${f.k}" ${f.isLocked ? 'checked' : ''}> <label for="chk-${f.k}" style="font-weight:bold; width:100%;"><i class="fas fa-folder" style="color:#f7b731; margin-right:5px;"></i> ${f.name}</label></div>`; }); };
    window.saveFolderLockChanges = async () => { const updates = {}; allGlobalFolders.forEach(f => { updates[`users/${curUser.uid}/files/${f.k}/isLocked`] = document.getElementById(`chk-${f.k}`).checked; }); await update(ref(db), updates); window.openPopup('success', 'Folder Locks Saved!', 'success'); };
    window.changeFolderLock = async () => { const newPass = document.getElementById('change-lock-pass').value; if(!newPass) return window.openPopup('alert', 'Enter new password', 'error'); await update(ref(db, `users/${curUser.uid}`), { folderPassword: newPass }); folderPassword = newPass; window.openPopup('success', 'Password Changed!', 'success'); document.getElementById('change-lock-pass').value = ''; };
    window.forgotFolderLock = () => { window.openPopup('confirm', 'Reset Folder Password? A link will be sent to your Gmail. Your folder locks will be removed.', 'warning', async () => { try { await sendPasswordResetEmail(auth, curUser.email); await update(ref(db, `users/${curUser.uid}`), { folderPassword: null }); folderPassword = null; const updates = {}; allGlobalFolders.forEach(f => { updates[`users/${curUser.uid}/files/${f.k}/isLocked`] = false; }); if(Object.keys(updates).length > 0) await update(ref(db), updates); window.openPopup('success', 'Reset link sent! Locks cleared.', 'success'); window.showSettingsView('main'); } catch(e) { window.openPopup('alert', 'Failed to send email.', 'error'); } }); };
    window.updateLoginPass = async () => { 
    const oldPass = document.getElementById('old-login-pass').value; 
    const newPass = document.getElementById('new-login-pass').value; 
    const confPass = document.getElementById('conf-login-pass').value; 

    if (!oldPass || !newPass || !confPass) return window.openPopup('alert', 'Please fill all fields.', 'error'); 
    if (newPass !== confPass) return window.openPopup('alert', 'New passwords do not match!', 'error'); 
    if (newPass.length < 6) return window.openPopup('alert', 'Password must be at least 6 characters.', 'error'); 

    try { 
        // Re-authenticate using Old Password
        const credential = EmailAuthProvider.credential(curUser.email, oldPass);
        await reauthenticateWithCredential(curUser, credential);
        
        // Update to New Password
        await updatePassword(curUser, newPass); 
        
        window.openPopup('success', 'Login Password updated successfully!', 'success'); 
        window.showSettingsView('main'); 
    } catch(e) { 
        if(e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
            window.openPopup('alert', 'Current password is incorrect!', 'error');
        } else {
            window.openPopup('alert', parseError(e.message), 'error'); 
        }
    } 
};
    window.openAdminInfo = async () => { window.showSettingsView('admin'); const snap = await get(ref(db, 'admin_settings/admin_info')); if (snap.exists()) { const data = snap.val(); document.getElementById('admin-pic').src = data.profilePic || 'https://via.placeholder.com/80'; document.getElementById('admin-name').innerText = data.name || 'Admin'; document.getElementById('admin-address').innerText = data.address || 'No address provided'; const linksDiv = document.getElementById('admin-links'); linksDiv.innerHTML = ''; if (data.links) { Object.values(data.links).forEach(l => { linksDiv.innerHTML += `<button class="neu-btn" style="font-size:12px; padding:10px;" onclick="window.open('${l.url}', '_blank')"><i class="fas fa-link" style="margin-right:8px;"></i> ${l.title}</button>`; }); } } else { document.getElementById('admin-name').innerText = 'Admin info not uploaded yet.'; document.getElementById('admin-address').innerText = ''; document.getElementById('admin-links').innerHTML = ''; } };
    window.logout = () => { window.openPopup('confirm', 'Are you sure you want to log out?', 'warning', () => { signOut(auth).then(() => location.reload()); }); };

    window.attemptNav = (id, name, isLocked) => { if (isLocked) { pendingFolderNav = { id, name }; document.getElementById('open-folder-pass').value = ""; window.openModal('verify-pass-modal'); } else { window.nav(id, name); } };
    window.verifyAndOpenFolder = () => { const pass = document.getElementById('open-folder-pass').value; if(pass === folderPassword) { window.closeModal('verify-pass-modal'); window.nav(pendingFolderNav.id, pendingFolderNav.name); pendingFolderNav = null; } else { window.openPopup('alert', 'Wrong Password!', 'error'); } };
    window.createFolder=()=>{ const n=document.getElementById('new-fold-name').value; if(n){ push(ref(db,`users/${curUser.uid}/files`),{name:n,type:'folder',parentId:curFold,createdAt:Date.now()}); document.getElementById('new-fold-name').value=""; window.closeModal('folder-modal'); } };
    window.deleteSelected = async () => { let t = 0; for (const k of selFiles) { const fRef = ref(db, `users/${curUser.uid}/files/${k}`); const snap = await get(fRef); if (snap.exists()) { const f = snap.val(); if(f.size) t += f.size; await remove(fRef); } } const us = await get(ref(db, `users/${curUser.uid}/usedStorageBytes`)); let c = us.val() || 0; await update(ref(db, `users/${curUser.uid}`), { usedStorageBytes: Math.max(c - t, 0) }); selFiles.clear(); document.getElementById('sel-actions').style.display='none'; document.getElementById('global-popup').style.display='none'; };
    function findMediaIndex(key) { return currentMediaList.findIndex(m => m.k === key); }
    window.nextMedia = () => { if(currentMediaList.length === 0) return; currentMediaIndex = (currentMediaIndex + 1) % currentMediaList.length; openMediaByIndex(currentMediaIndex); };
    window.prevMedia = () => { if(currentMediaList.length === 0) return; currentMediaIndex = (currentMediaIndex - 1 + currentMediaList.length) % currentMediaList.length; openMediaByIndex(currentMediaIndex); };
    function openMediaByIndex(idx) { const item = currentMediaList[idx]; if(item.type === 'video') { window.closePhotoViewer(); window.playVideoInApp(item.url, item.k, false); } else if (item.type === 'image') { window.closeVideoPlayer(); window.viewPhoto(item.url, item.k, false); } }
    window.viewPhoto = (url, key, resetIndex=true) => { if(resetIndex) currentMediaIndex = findMediaIndex(key); document.getElementById('main-photo').src = url; document.getElementById('photo-viewer').style.display = 'flex'; };
    window.closePhotoViewer = () => { document.getElementById('photo-viewer').style.display = 'none'; document.getElementById('main-photo').src = ""; };
    window.playVideoInApp = (url, key, resetIndex=true) => { if(resetIndex) currentMediaIndex = findMediaIndex(key); const p=document.getElementById('custom-player'), v=document.getElementById('main-video'), s=document.getElementById('vid-seek'); v.src = url; p.style.display = 'flex'; v.play(); document.getElementById('play-btn').innerHTML = '<i class="fas fa-pause"></i>'; v.ontimeupdate=()=>{ s.value=(v.currentTime/v.duration)*100; let m=Math.floor(v.currentTime/60), sec=Math.floor(v.currentTime%60); document.getElementById('vid-time-txt').innerText=`${m}:${sec<10?'0':''}${sec}`; }; s.oninput=()=>{ v.currentTime=(s.value/100)*v.duration; }; };
    window.toggleVideo = () => { const v=document.getElementById('main-video'), b=document.getElementById('play-btn'); if(v.paused){ v.play(); b.innerHTML='<i class="fas fa-pause"></i>'; } else { v.pause(); b.innerHTML='<i class="fas fa-play"></i>'; } };
    window.closeVideoPlayer = () => { document.getElementById('custom-player').style.display='none'; document.getElementById('main-video').pause(); document.getElementById('main-video').src=""; };
    function togSel(k,el) { if(selFiles.has(k)){selFiles.delete(k);el.classList.remove('selected');}else{selFiles.add(k);el.classList.add('selected');} document.getElementById('sel-actions').style.display=selFiles.size>0?'flex':'none'; }
    window.nav = (id, name) => { curFold = id; foldPath.push({ id, name }); upPath(); history.pushState({}, ""); renderFiles(dbSnapshot); };
    window.goBack = () => { if(curFold === 'root') return; foldPath.pop(); curFold = foldPath[foldPath.length - 1].id; upPath(); renderFiles(dbSnapshot); };
    function upPath() { document.getElementById('path-bar').style.display=curFold==='root'?'none':'flex'; document.getElementById('curr-folder').innerText="/ "+foldPath.map(p=>p.name).join(" / "); }
    function parseError(msg) { if (msg.includes("user-not-found")) return "User not found"; if (msg.includes("wrong-password")) return "Wrong password"; if (msg.includes("email-already-in-use")) return "Email already registered"; return msg; }
