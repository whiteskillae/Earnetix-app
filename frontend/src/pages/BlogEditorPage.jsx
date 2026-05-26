import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import toast from 'react-hot-toast';
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, Link, Image, Film,
  Plus, Minus, Eye, Upload, X, ChevronDown, Trash2, Move,
  Palette, Highlighter, Send, Save, ArrowLeft, BookOpen, Clock, Hash,
} from 'lucide-react';

// ─── Local IndexedDB for Draft Images ──────────────────────────────
const DB_NAME = 'BlogDraftsDB';
const STORE_NAME = 'draft_images';

const initDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const saveImageToIDB = async (id, file) => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, file });
    tx.oncomplete = () => resolve();
  });
};

const getImageFromIDB = async (id) => {
  const db = await initDB();
  return new Promise((resolve) => {
    const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result?.file);
  });
};

const getAllImagesFromIDB = async () => {
  const db = await initDB();
  return new Promise((resolve) => {
    const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
};

const clearIDB = async () => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
  });
};

// ─── Color Picker Component ───────────────────────────────────────
const ColorPicker = ({ value, onChange, title }) => {
  const colors = [
    '#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8', '#64748b',
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#000000',
  ];
  return (
    <div className="blog-color-picker">
      <div className="blog-color-presets">
        {colors.map(c => (
          <button key={c} type="button" title={c}
            style={{ background: c, border: value === c ? '2px solid var(--blue)' : '2px solid transparent' }}
            onClick={() => onChange(c)} />
        ))}
      </div>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} title={title} />
    </div>
  );
};

// ─── Toolbar Button ───────────────────────────────────────────────
const ToolBtn = ({ onClick, title, active, children }) => (
  <button type="button" title={title}
    className={`blog-tool-btn ${active ? 'active' : ''}`}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}>
    {children}
  </button>
);

// ─── Image Insert Modal ───────────────────────────────────────────
const ImageInsertModal = ({ onInsert, onClose }) => {
  const [tab, setTab] = useState('upload');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [alt, setAlt] = useState('');
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be ≤5MB'); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleInsert = () => {
    if (tab === 'url') {
      if (!url.trim()) { toast.error('Please enter an image URL'); return; }
      onInsert({ type: 'image', src: url, alt: alt || 'Image', file: null });
    } else {
      if (!file && !preview) { toast.error('Please select an image'); return; }
      onInsert({ type: 'image', src: preview, alt: alt || 'Image', file });
    }
    onClose();
  };

  return (
    <div className="blog-modal-overlay" onClick={onClose}>
      <div className="blog-modal-box" onClick={e => e.stopPropagation()}>
        <div className="blog-modal-header">
          <h3><Image size={18} /> Insert Image</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="blog-modal-tabs">
          <button type="button" className={tab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')}>Upload</button>
          <button type="button" className={tab === 'url' ? 'active' : ''} onClick={() => setTab('url')}>URL</button>
        </div>
        {tab === 'upload' ? (
          <div className="blog-upload-zone" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px' }} />
            ) : (
              <>
                <Upload size={32} style={{ opacity: 0.4 }} />
                <p>Click or drag image (≤5MB)</p>
              </>
            )}
          </div>
        ) : (
          <input className="blog-modal-input" type="url" placeholder="https://example.com/image.jpg" value={url} onChange={e => setUrl(e.target.value)} />
        )}
        <input className="blog-modal-input" type="text" placeholder="Alt text (optional)" value={alt} onChange={e => setAlt(e.target.value)} />
        <button type="button" className="btn-blog-primary" onClick={handleInsert}>Insert Image</button>
      </div>
    </div>
  );
};

// ─── Video/iframe Insert Modal ─────────────────────────────────────
const IframeModal = ({ onInsert, onClose }) => {
  const [url, setUrl] = useState('');

  const getEmbedUrl = (raw) => {
    if (!raw) return '';
    const ytMatch = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    if (raw.includes('vimeo.com')) {
      const vm = raw.match(/vimeo\.com\/(\d+)/);
      if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
    }
    return raw; // assume already embed URL
  };

  const handleInsert = () => {
    if (!url.trim()) { toast.error('Please enter a video URL'); return; }
    onInsert({ type: 'iframe', src: getEmbedUrl(url) });
    onClose();
  };

  return (
    <div className="blog-modal-overlay" onClick={onClose}>
      <div className="blog-modal-box" onClick={e => e.stopPropagation()}>
        <div className="blog-modal-header">
          <h3><Film size={18} /> Embed Video</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <input className="blog-modal-input" type="url" placeholder="YouTube / Vimeo / any embed URL"
          value={url} onChange={e => setUrl(e.target.value)} autoFocus />
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '16px' }}>
          Supports YouTube, Vimeo, or any iframe-compatible URL.
        </p>
        <button type="button" className="btn-blog-primary" onClick={handleInsert}>Embed Video</button>
      </div>
    </div>
  );
};

// ─── Link Insert Modal ─────────────────────────────────────────────
const LinkModal = ({ onInsert, onClose }) => {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  return (
    <div className="blog-modal-overlay" onClick={onClose}>
      <div className="blog-modal-box" onClick={e => e.stopPropagation()}>
        <div className="blog-modal-header">
          <h3><Link size={18} /> Insert Link</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <input className="blog-modal-input" type="text" placeholder="Link text" value={text} onChange={e => setText(e.target.value)} autoFocus />
        <input className="blog-modal-input" type="url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
        <button type="button" className="btn-blog-primary" onClick={() => { if (url) { onInsert(url, text); onClose(); } else toast.error('Enter a URL'); }}>
          Insert Link
        </button>
      </div>
    </div>
  );
};

// ─── Task Selector Modal ───────────────────────────────────────────
const TaskSelectorModal = ({ tasks, onSelect, onClose }) => {
  const { publicTasks = [], assignedTasks = [] } = tasks;
  const all = [
    ...publicTasks.map(t => ({ ...t, taskType: 'public' })),
    ...assignedTasks.map(t => ({ ...t, taskType: 'assigned' })),
  ];

  return (
    <div className="blog-modal-overlay" onClick={onClose}>
      <div className="blog-modal-box" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
        <div className="blog-modal-header">
          <h3><BookOpen size={18} /> Select a Blog Task</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        {all.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
            <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p>No blog tasks available. Admin must create a blog-type task first.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {all.map(t => (
              <div key={t._id} className="blog-task-select-card" onClick={() => onSelect(t)}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: t.taskType === 'assigned' ? 'var(--blue)' : 'var(--green)',
                      padding: '2px 8px', border: '1px solid', borderColor: t.taskType === 'assigned' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)',
                      borderRadius: '8px' }}>
                      {t.taskType === 'assigned' ? 'MISSION' : 'PUBLIC'}
                    </span>
                    <h4 style={{ margin: 0, fontWeight: 700 }}>{t.title}</h4>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginTop: '4px', marginBottom: 0 }}>{t.description?.slice(0, 100)}...</p>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--green)', whiteSpace: 'nowrap' }}>
                  +{t.rewardPoints} pts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Blog Editor ──────────────────────────────────────────────
const BlogEditorPage = () => {
  const { taskId: pathTaskId } = useParams();
  const [searchParams] = useSearchParams();
  const queryTaskId = searchParams.get('taskId');
  const taskId = pathTaskId || queryTaskId;
  const editBlogId = searchParams.get('edit');
  const presetTaskType = searchParams.get('type') || 'public';
  const navigate = useNavigate();
  const { request } = useApi();

  const editorRef = useRef(null);
  const [pages, setPages] = useState(['']);
  const [currentPage, setCurrentPage] = useState(0);
  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [fontSize, setFontSize] = useState('16');
  const [fontColor, setFontColor] = useState('#ffffff');
  const [highlightColor, setHighlightColor] = useState('#fbbf24');
  const [showColorPicker, setShowColorPicker] = useState(null); // 'text' | 'highlight' | null
  const [showImageModal, setShowImageModal] = useState(false);
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [blogTasks, setBlogTasks] = useState({ publicTasks: [], assignedTasks: [] });
  const [publishing, setPublishing] = useState(false);
  const [pendingImages, setPendingImages] = useState([]); // files to upload on publish
  const [savedAt, setSavedAt] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [tasksLoading, setTasksLoading] = useState(true);

  // ── Load blog tasks ────────────────────────────────────────────
  useEffect(() => {
    const loadBlogTasks = async () => {
      setTasksLoading(true);
      try {
        const res = await request('get', '/blogs/tasks');
        if (res.success) {
          setBlogTasks(res.data);
          // Auto-open task selector if no taskId in URL and not editing
          const total = (res.data.publicTasks?.length || 0) + (res.data.assignedTasks?.length || 0);
          if (!taskId && !editBlogId && total > 0) {
            setShowTaskSelector(true);
          }
        }
      } catch {}
      setTasksLoading(false);
    };
    loadBlogTasks();
  }, []);

  // ── If taskId in URL, pre-select that task ─────────────────────
  useEffect(() => {
    if (taskId && blogTasks) {
      const allTasks = [
        ...blogTasks.publicTasks.map(t => ({ ...t, taskType: 'public' })),
        ...blogTasks.assignedTasks.map(t => ({ ...t, taskType: 'assigned' })),
      ];
      const found = allTasks.find(t => t._id === taskId) || { _id: taskId, taskType: presetTaskType };
      if (found) setSelectedTask(found);
    }
  }, [taskId, blogTasks, presetTaskType]);

  // ── Load existing blog for editing ────────────────────────────
  useEffect(() => {
    if (!editBlogId) return;
    const loadBlog = async () => {
      try {
        const res = await request('get', `/blogs/detail/${editBlogId}`);
        if (res.success) {
          const blog = res.data;
          setTitle(blog.title);
          const loadedPages = blog.pages?.length > 0 ? blog.pages : [blog.content];
          setPages(loadedPages);
          if (editorRef.current) editorRef.current.innerHTML = loadedPages[0] || '';
          if (blog.coverImage) setCoverPreview(blog.coverImage);
          setSelectedTask({ _id: blog.taskId, taskType: blog.taskType });
        }
      } catch {}
    };
    loadBlog();
  }, [editBlogId]);

  // ── Autosave to localStorage ───────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('blog_draft', JSON.stringify({ title, pages, selectedTask, timestamp: Date.now() }));
      setSavedAt(new Date());
    }, 5000);
    return () => clearTimeout(timer);
  }, [title, pages, selectedTask]);

  // ── Word count ─────────────────────────────────────────────────
  useEffect(() => {
    const text = pages.join(' ').replace(/<[^>]*>/g, ' ').trim();
    const wc = text ? text.split(/\s+/).length : 0;
    setWordCount(wc);
  }, [pages]);

  // ── IDB Image Rehydration ──────────────────────────────────────
  useEffect(() => {
    const rehydrateImages = async () => {
      const allDraftImages = await getAllImagesFromIDB();
      if (!allDraftImages.length) return;
      
      setPages(prevPages => {
        let changed = false;
        const newPages = prevPages.map(pageHtml => {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = pageHtml;
          const pendingImgs = tempDiv.querySelectorAll('img[data-pending="true"]');
          pendingImgs.forEach(img => {
            const localId = img.getAttribute('data-local-id');
            const found = allDraftImages.find(i => i.id === localId);
            if (found && found.file) {
              const objUrl = URL.createObjectURL(found.file);
              // don't revoke here because it's needed for the editor
              img.src = objUrl;
              changed = true;
            }
          });
          return changed ? tempDiv.innerHTML : pageHtml;
        });
        
        if (changed && editorRef.current) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = newPages[currentPage];
          editorRef.current.innerHTML = tempDiv.innerHTML;
        }
        return newPages;
      });
    };
    
    setTimeout(rehydrateImages, 500);
  }, [editBlogId]);

  // ── Editor command helpers ─────────────────────────────────────
  const exec = useCallback((cmd, value = null) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    saveCurrentPageContent();
  }, []);

  const saveCurrentPageContent = useCallback(() => {
    if (editorRef.current) {
      setPages(prev => {
        const updated = [...prev];
        updated[currentPage] = editorRef.current.innerHTML;
        return updated;
      });
    }
  }, [currentPage]);

  const switchPage = (idx) => {
    saveCurrentPageContent();
    setCurrentPage(idx);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = pages[idx] || '';
    }, 10);
  };

  const addPage = () => {
    saveCurrentPageContent();
    const newPages = [...pages, ''];
    setPages(newPages);
    const newIdx = newPages.length - 1;
    setCurrentPage(newIdx);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = '';
      editorRef.current?.focus();
    }, 10);
  };

  const deletePage = (idx) => {
    if (pages.length <= 1) { toast.error('Cannot delete the only page'); return; }
    const newPages = pages.filter((_, i) => i !== idx);
    setPages(newPages);
    const newIdx = Math.min(idx, newPages.length - 1);
    setCurrentPage(newIdx);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = newPages[newIdx] || '';
    }, 10);
  };

  // ── Insert image into editor ───────────────────────────────────
  const handleInsertImage = async ({ src, alt, file }) => {
    const localId = file ? `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : null;
    const wrapperHTML = (imgSrc) => `<span class="resizer-wrap" style="display:inline-block; resize:both; overflow:hidden; max-width:100%; width:300px; border:2px solid transparent; border-radius:8px; margin:8px; vertical-align:middle; transition:border-color 0.2s;"><img src="${imgSrc}" alt="${alt || 'Image'}" ${localId ? `data-pending="true" data-local-id="${localId}"` : ''} style="width:100%; height:100%; object-fit:cover; display:block; cursor:pointer;" /></span>&nbsp;`;
    if (file) {
      setPendingImages(prev => [...prev, file]);
      // Save to IndexedDB for persistence
      try { await saveImageToIDB(localId, file); } catch {}
      const blobUrl = URL.createObjectURL(file);
      exec('insertHTML', wrapperHTML(blobUrl));
    } else {
      exec('insertHTML', wrapperHTML(src));
    }
  };

  // ── Insert iframe ──────────────────────────────────────────────
  const handleInsertIframe = ({ src }) => {
    exec('insertHTML', `<div class="blog-iframe-wrap" style="position:relative;padding-bottom:56.25%;height:0;border-radius:16px;overflow:hidden;margin:20px 0;"><iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe></div>`);
  };

  // ── Insert link ────────────────────────────────────────────────
  const handleInsertLink = (url, text) => {
    exec('insertHTML', `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--blue-light);text-decoration:underline;">${text || url}</a>`);
  };

  // ── Insert horizontal rule ─────────────────────────────────────
  const insertHR = () => exec('insertHTML', '<hr style="border:none;border-top:2px solid rgba(255,255,255,0.1);margin:32px 0;" /><p><br></p>');

  // ── Cover image ────────────────────────────────────────────────
  const handleCoverChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error('Cover image must be ≤5MB'); return; }
    setCoverImage(f);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  // ── Publish ────────────────────────────────────────────────────
  const handlePublish = async () => {
    saveCurrentPageContent();
    if (!title.trim()) { toast.error('Please add a blog title'); return; }
    if (!selectedTask) { toast.error('Please select a task for this blog'); return; }
    const allContent = pages.join('\n');
    if (!allContent.replace(/<[^>]*>/g, '').trim()) { toast.error('Blog content cannot be empty'); return; }

    setPublishing(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());

      // Replace blob URLs in content/pages with local:id placeholders before sending
      const allDraftImages = await getAllImagesFromIDB();
      let processedContent = allContent;
      let processedPages = [...pages];

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = allContent;
      const pendingImgs = Array.from(tempDiv.querySelectorAll('img[data-pending="true"]'));
      const imageFiles = [];

      for (const img of pendingImgs) {
        const localId = img.getAttribute('data-local-id');
        if (!localId) continue;
        const draftImg = allDraftImages.find(item => item.id === localId);
        if (draftImg && draftImg.file) {
          imageFiles.push({ id: localId, file: draftImg.file });
          // Replace blob src with local:id placeholder in content
          const blobSrc = img.getAttribute('src');
          if (blobSrc) {
            const escaped = blobSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'g');
            processedContent = processedContent.replace(regex, `local:${localId}`);
            processedPages = processedPages.map(p => p.replace(regex, `local:${localId}`));
          }
        }
      }

      formData.append('content', processedContent);
      formData.append('pages', JSON.stringify(processedPages));
      formData.append('taskId', selectedTask._id);
      formData.append('taskType', selectedTask.taskType);
      formData.append('wordCount', wordCount);

      if (coverImage) formData.append('coverImage', coverImage);

      for (const { id, file } of imageFiles) {
        const newFile = new File([file], `local:${id}`, { type: file.type || 'image/jpeg' });
        formData.append('inlineImages', newFile);
      }

      let res;
      if (editBlogId) {
        res = await request('put', `/blogs/${editBlogId}`, formData);
      } else {
        res = await request('post', '/blogs', formData);
      }

      if (res.success) {
        toast.success(editBlogId ? 'Blog resubmitted for review!' : 'Blog published! Pending admin review.');
        localStorage.removeItem('blog_draft');
        await clearIDB();
        navigate('/blog');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish blog');
    } finally {
      setPublishing(false);
    }
  };

  // ── Get full preview HTML ──────────────────────────────────────
  const getPreviewHTML = () => {
    saveCurrentPageContent();
    return pages.join('<hr style="border:none;border-top:2px solid rgba(255,255,255,0.1);margin:48px 0;" />');
  };

  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const totalBlogTasks = (blogTasks.publicTasks?.length || 0) + (blogTasks.assignedTasks?.length || 0);

  // ── Gate: loading ─────────────────────────────────────────────
  if (tasksLoading && !editBlogId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--dark)', color: 'var(--gray-400)' }}>
        <span className="spin-dot" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
        <p style={{ fontWeight: 700 }}>Loading blog tasks...</p>
        <style>{`.spin-dot { display: inline-block; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Gate: no blog tasks available ─────────────────────────────
  if (!tasksLoading && totalBlogTasks === 0 && !editBlogId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', background: 'var(--dark)', padding: '40px', textAlign: 'center' }}>
        <BookOpen size={64} style={{ opacity: 0.15 }} />
        <h2 style={{ margin: 0, fontWeight: 900, color: 'white' }}>No Blog Tasks Available</h2>
        <p style={{ color: 'var(--gray-400)', maxWidth: '420px', lineHeight: 1.7 }}>
          You can only write a blog when the admin has created a <strong style={{ color: 'white' }}>Blog-type task</strong> or assigned a <strong style={{ color: 'white' }}>Blog mission</strong> to you.
        </p>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Check back later or contact your admin.</p>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: 'var(--gray-300)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
          onClick={() => navigate('/blog')}
        >
          <ArrowLeft size={18} /> Back to Blogs
        </button>
        <style>{`.spin-dot { display: inline-block; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="blog-editor-wrapper">
      {/* ── Top Bar ─────────────────────────────── */}
      <div className="blog-editor-topbar">
        <button className="blog-back-btn" onClick={() => navigate('/blog')}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="blog-editor-title-wrap">
          <h1>Blog Editor</h1>
          {savedAt && <span className="blog-autosave-info"><Save size={12} /> Draft saved {savedAt.toLocaleTimeString()}</span>}
        </div>
        <div className="blog-topbar-actions">
          <div className="blog-meta-pills">
            <span><Hash size={12} /> {wordCount} words</span>
            <span><Clock size={12} /> {readTime} min read</span>
          </div>
          <button type="button" className="blog-btn-secondary" onClick={() => setShowPreview(true)}>
            <Eye size={16} /> Preview
          </button>
          <button type="button" className="blog-btn-publish" onClick={handlePublish} disabled={publishing}>
            {publishing ? <><span className="spin-dot" />Publishing...</> : <><Send size={16} />{editBlogId ? 'Resubmit' : 'Publish'}</>}
          </button>
        </div>
      </div>

      <div className="blog-editor-layout">
        {/* ── Left: Task + Cover ──────────────────── */}
        <div className="blog-editor-sidebar-left">
          {/* Task Selection */}
          <div className="blog-sidebar-card">
            <h4>Linked Task</h4>
            {selectedTask ? (
              <div className="blog-task-linked">
                <BookOpen size={16} />
                <span>{selectedTask.title || `Task #${selectedTask._id?.slice(-6)}`}</span>
                {!editBlogId && <button type="button" onClick={() => setShowTaskSelector(true)}><X size={14} /></button>}
              </div>
            ) : (
              <button type="button" className="blog-select-task-btn" onClick={() => setShowTaskSelector(true)}>
                <BookOpen size={18} /> Select Task
              </button>
            )}
          </div>

          {/* Cover Image */}
          <div className="blog-sidebar-card">
            <h4>Cover Image</h4>
            <div className="blog-cover-upload" onClick={() => document.getElementById('blog-cover-input').click()}>
              <input id="blog-cover-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" style={{ width: '100%', borderRadius: '12px', maxHeight: '200px', objectFit: 'cover' }} />
              ) : (
                <div className="blog-cover-placeholder">
                  <Image size={32} style={{ opacity: 0.3 }} />
                  <p>Click to upload cover (≤5MB)</p>
                </div>
              )}
            </div>
            {coverPreview && <button type="button" className="blog-remove-cover" onClick={() => { setCoverImage(null); setCoverPreview(null); }}>Remove Cover</button>}
          </div>

          {/* Pages */}
          <div className="blog-sidebar-card">
            <h4>Pages</h4>
            <div className="blog-pages-list">
              {pages.map((_, idx) => (
                <div key={idx} className={`blog-page-item ${currentPage === idx ? 'active' : ''}`} onClick={() => switchPage(idx)}>
                  <span>Page {idx + 1}</span>
                  {pages.length > 1 && (
                    <button type="button" onClick={e => { e.stopPropagation(); deletePage(idx); }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="blog-add-page-btn" onClick={addPage}>
                <Plus size={14} /> Add Page
              </button>
            </div>
          </div>
        </div>

        {/* ── Center: Title + Toolbar + Editor ────── */}
        <div className="blog-editor-main">
          {/* Blog Title */}
          <input
            className="blog-title-input"
            type="text"
            placeholder="Blog Title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
          />

          {/* Toolbar */}
          <div className="blog-toolbar">
            {/* Heading */}
            <select className="blog-tool-select" onChange={e => exec('formatBlock', e.target.value)} defaultValue="">
              <option value="" disabled>Heading</option>
              <option value="p">Paragraph</option>
              <option value="h1">H1</option>
              <option value="h2">H2</option>
              <option value="h3">H3</option>
              <option value="h4">H4</option>
            </select>

            {/* Font Size */}
            <select className="blog-tool-select" value={fontSize}
              onChange={e => { setFontSize(e.target.value); exec('fontSize', e.target.value); }}>
              {[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>{[10,13,16,18,24,32,48][s-1]}px</option>)}
            </select>

            <div className="blog-toolbar-divider" />

            <ToolBtn onClick={() => exec('bold')} title="Bold"><Bold size={16} /></ToolBtn>
            <ToolBtn onClick={() => exec('italic')} title="Italic"><Italic size={16} /></ToolBtn>
            <ToolBtn onClick={() => exec('underline')} title="Underline"><Underline size={16} /></ToolBtn>
            <ToolBtn onClick={() => exec('strikeThrough')} title="Strikethrough"><Strikethrough size={16} /></ToolBtn>

            <div className="blog-toolbar-divider" />

            {/* Text Color */}
            <div className="blog-color-wrap">
              <ToolBtn onClick={() => setShowColorPicker(showColorPicker === 'text' ? null : 'text')} title="Text Color">
                <Palette size={16} style={{ color: fontColor }} />
              </ToolBtn>
              {showColorPicker === 'text' && (
                <div className="blog-color-dropdown">
                  <ColorPicker value={fontColor} onChange={c => { setFontColor(c); exec('foreColor', c); setShowColorPicker(null); }} title="Text Color" />
                </div>
              )}
            </div>

            {/* Highlight */}
            <div className="blog-color-wrap">
              <ToolBtn onClick={() => setShowColorPicker(showColorPicker === 'highlight' ? null : 'highlight')} title="Highlight">
                <Highlighter size={16} style={{ color: highlightColor }} />
              </ToolBtn>
              {showColorPicker === 'highlight' && (
                <div className="blog-color-dropdown">
                  <ColorPicker value={highlightColor} onChange={c => { setHighlightColor(c); exec('hiliteColor', c); setShowColorPicker(null); }} title="Highlight Color" />
                </div>
              )}
            </div>

            <div className="blog-toolbar-divider" />

            <ToolBtn onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeft size={16} /></ToolBtn>
            <ToolBtn onClick={() => exec('justifyCenter')} title="Align Center"><AlignCenter size={16} /></ToolBtn>
            <ToolBtn onClick={() => exec('justifyRight')} title="Align Right"><AlignRight size={16} /></ToolBtn>
            <ToolBtn onClick={() => exec('justifyFull')} title="Justify"><AlignJustify size={16} /></ToolBtn>

            <div className="blog-toolbar-divider" />

            <ToolBtn onClick={() => exec('insertUnorderedList')} title="Bullet List"><List size={16} /></ToolBtn>
            <ToolBtn onClick={() => exec('insertOrderedList')} title="Numbered List"><ListOrdered size={16} /></ToolBtn>

            <div className="blog-toolbar-divider" />

            <ToolBtn onClick={() => exec('indent')} title="Indent"><Plus size={16} /></ToolBtn>
            <ToolBtn onClick={() => exec('outdent')} title="Outdent"><Minus size={16} /></ToolBtn>

            <div className="blog-toolbar-divider" />

            <ToolBtn onClick={insertHR} title="Separator"><span style={{ fontWeight: 900, fontSize: '0.8rem' }}>—</span></ToolBtn>
            <ToolBtn onClick={() => setShowImageModal(true)} title="Insert Image"><Image size={16} /></ToolBtn>
            <ToolBtn onClick={() => setShowIframeModal(true)} title="Embed Video"><Film size={16} /></ToolBtn>
            <ToolBtn onClick={() => setShowLinkModal(true)} title="Insert Link"><Link size={16} /></ToolBtn>
          </div>

          {/* Page indicator */}
          <div className="blog-page-indicator">
            Page {currentPage + 1} of {pages.length}
          </div>

          {/* Editor Area */}
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              ref={editorRef}
              className="blog-editor-area"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start writing your blog..."
              onInput={saveCurrentPageContent}
              onBlur={saveCurrentPageContent}
              onClick={(e) => {
                if (!editorRef.current) return;
                
                // Clear all selection
                const wraps = editorRef.current.querySelectorAll('.resizer-wrap');
                wraps.forEach(w => {
                  w.classList.remove('selected');
                  // Remove old controls if they exist to clean up
                  const controls = w.querySelectorAll('.img-controls, .resize-handle, .drag-handle');
                  controls.forEach(c => c.remove());
                });
                
                let targetWrap = null;
                if (e.target.tagName === 'IMG' && e.target.parentElement?.classList.contains('resizer-wrap')) {
                  targetWrap = e.target.parentElement;
                } else if (e.target.classList?.contains('resizer-wrap')) {
                  targetWrap = e.target;
                }
                
                if (targetWrap) {
                  targetWrap.classList.add('selected');
                  
                  // Inject controls
                  if (!targetWrap.querySelector('.img-controls')) {
                    const controls = document.createElement('div');
                    controls.className = 'img-controls';
                    controls.innerHTML = '<button class="img-btn del" title="Delete Image">🗑️</button>';
                    
                    const dragHandle = document.createElement('div');
                    dragHandle.className = 'drag-handle';
                    dragHandle.innerHTML = '✋';
                    dragHandle.draggable = true;
                    
                    const resizeHandle = document.createElement('div');
                    resizeHandle.className = 'resize-handle br';
                    
                    controls.querySelector('.del').onclick = () => {
                      targetWrap.remove();
                      saveCurrentPageContent();
                    };
                    
                    // Drag logic
                    dragHandle.ondragstart = (ev) => {
                      ev.dataTransfer.setData('text/html', targetWrap.outerHTML);
                      ev.dataTransfer.effectAllowed = 'move';
                      setTimeout(() => targetWrap.classList.add('dragging'), 0);
                    };
                    dragHandle.ondragend = () => {
                      targetWrap.classList.remove('dragging');
                    };
                    
                    // Resize logic
                    let startX, startW;
                    resizeHandle.onmousedown = (ev) => {
                      ev.preventDefault();
                      startX = ev.clientX;
                      startW = targetWrap.offsetWidth;
                      document.onmousemove = (e) => {
                        const newW = startW + (e.clientX - startX);
                        if (newW > 50) targetWrap.style.width = newW + 'px';
                      };
                      document.onmouseup = () => {
                        document.onmousemove = null;
                        document.onmouseup = null;
                        saveCurrentPageContent();
                      };
                    };
                    
                    targetWrap.appendChild(controls);
                    targetWrap.appendChild(dragHandle);
                    targetWrap.appendChild(resizeHandle);
                  }
                }
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={(e) => {
                e.preventDefault();
                const html = e.dataTransfer.getData('text/html');
                if (html && html.includes('resizer-wrap')) {
                  const dragging = editorRef.current.querySelector('.resizer-wrap.dragging');
                  if (dragging) dragging.remove();
                  document.execCommand('insertHTML', false, html);
                  saveCurrentPageContent();
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showImageModal && <ImageInsertModal onInsert={handleInsertImage} onClose={() => setShowImageModal(false)} />}
      {showIframeModal && <IframeModal onInsert={handleInsertIframe} onClose={() => setShowIframeModal(false)} />}
      {showLinkModal && <LinkModal onInsert={handleInsertLink} onClose={() => setShowLinkModal(false)} />}
      {showTaskSelector && <TaskSelectorModal tasks={blogTasks} onSelect={t => { setSelectedTask(t); setShowTaskSelector(false); }} onClose={() => setShowTaskSelector(false)} />}

      {/* Preview Modal */}
      {showPreview && (
        <div className="blog-preview-overlay">
          <div className="blog-preview-container">
            <div className="blog-preview-header">
              <h3>Preview</h3>
              <button type="button" onClick={() => setShowPreview(false)}><X size={20} /></button>
            </div>
            {coverPreview && <img src={coverPreview} alt="Cover" className="blog-preview-cover" />}
            <h1 className="blog-preview-title">{title || 'Untitled Blog'}</h1>
            <div className="blog-preview-meta">
              <span><Clock size={14} /> {readTime} min read</span>
              <span><Hash size={14} /> {wordCount} words</span>
              <span>{pages.length} page{pages.length > 1 ? 's' : ''}</span>
            </div>
            <div className="blog-preview-content" dangerouslySetInnerHTML={{ __html: getPreviewHTML() }} />
          </div>
        </div>
      )}

      <style>{`
        .blog-editor-wrapper { min-height: 100vh; background: var(--dark); display: flex; flex-direction: column; }
        
        /* Top Bar */
        .blog-editor-topbar { 
          position: sticky; top: 0; z-index: 100; 
          display: flex; align-items: center; gap: 16px; 
          padding: 12px 24px; 
          background: rgba(10,10,15,0.95); 
          backdrop-filter: blur(20px); 
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
        }
        .blog-back-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: var(--gray-400); font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .blog-back-btn:hover { background: rgba(255,255,255,0.08); color: white; }
        .blog-editor-title-wrap { flex: 1; }
        .blog-editor-title-wrap h1 { margin: 0; font-size: 1.1rem; font-weight: 800; background: var(--blue-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .blog-autosave-info { display: flex; align-items: center; gap: 4px; font-size: 0.7rem; color: var(--gray-600); margin-top: 2px; }
        .blog-topbar-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .blog-meta-pills { display: flex; gap: 12px; }
        .blog-meta-pills span { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: var(--gray-500); font-weight: 700; }
        .blog-btn-secondary { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: var(--gray-300); font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .blog-btn-secondary:hover { background: rgba(255,255,255,0.08); color: white; }
        .blog-btn-publish { display: flex; align-items: center; gap: 8px; padding: 10px 24px; background: var(--blue-gradient); border: none; border-radius: 12px; color: white; font-size: 0.9rem; font-weight: 800; cursor: pointer; transition: all 0.3s; box-shadow: 0 8px 24px rgba(59,130,246,0.3); }
        .blog-btn-publish:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(59,130,246,0.4); }
        .blog-btn-publish:disabled { opacity: 0.6; cursor: not-allowed; }
        .spin-dot { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Layout */
        .blog-editor-layout { display: grid; grid-template-columns: 260px 1fr; gap: 0; flex: 1; min-height: calc(100vh - 64px); }
        @media (max-width: 900px) { .blog-editor-layout { grid-template-columns: 1fr; } }

        /* Left Sidebar */
        .blog-editor-sidebar-left { padding: 24px 16px; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 16px; overflow-y: auto; background: rgba(255,255,255,0.01); }
        .blog-sidebar-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; }
        .blog-sidebar-card h4 { margin: 0 0 12px; font-size: 0.7rem; font-weight: 900; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.1em; }
        
        .blog-task-linked { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: var(--blue-light); }
        .blog-task-linked button { background: none; border: none; color: var(--gray-500); cursor: pointer; margin-left: auto; }
        .blog-select-task-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: rgba(59,130,246,0.05); border: 2px dashed rgba(59,130,246,0.2); border-radius: 12px; color: var(--blue-light); font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .blog-select-task-btn:hover { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.4); }

        .blog-cover-upload { cursor: pointer; border: 2px dashed rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; transition: all 0.2s; }
        .blog-cover-upload:hover { border-color: rgba(59,130,246,0.3); }
        .blog-cover-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 16px; color: var(--gray-500); font-size: 0.8rem; text-align: center; }
        .blog-remove-cover { width: 100%; margin-top: 8px; padding: 8px; background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.15); border-radius: 10px; color: #ef4444; font-size: 0.8rem; font-weight: 700; cursor: pointer; }

        .blog-pages-list { display: flex; flex-direction: column; gap: 8px; }
        .blog-page-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 700; color: var(--gray-400); transition: all 0.2s; }
        .blog-page-item.active { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.2); color: var(--blue-light); }
        .blog-page-item button { background: none; border: none; color: var(--gray-600); cursor: pointer; }
        .blog-add-page-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: none; border: 1px dashed rgba(255,255,255,0.08); border-radius: 10px; color: var(--gray-500); font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .blog-add-page-btn:hover { border-color: rgba(59,130,246,0.3); color: var(--blue-light); }

        /* Main editor area */
        .blog-editor-main { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
        .blog-title-input { width: 100%; padding: 20px 32px; font-size: 2rem; font-weight: 900; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.06); color: white; outline: none; }
        .blog-title-input::placeholder { color: rgba(255,255,255,0.15); }

        /* Toolbar */
        .blog-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; padding: 10px 24px; background: rgba(10,10,15,0.8); border-bottom: 1px solid rgba(255,255,255,0.05); position: sticky; top: 57px; z-index: 50; backdrop-filter: blur(10px); }
        .blog-tool-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 8px; color: var(--gray-400); cursor: pointer; transition: all 0.15s; font-size: 0.8rem; }
        .blog-tool-btn:hover { background: rgba(255,255,255,0.07); color: white; }
        .blog-tool-btn.active { background: rgba(59,130,246,0.15); color: var(--blue-light); }
        .blog-toolbar-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.07); margin: 0 4px; }
        .blog-tool-select { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; color: var(--gray-300); font-size: 0.8rem; font-weight: 700; padding: 4px 8px; cursor: pointer; outline: none; }
        
        /* Color Picker */
        .blog-color-wrap { position: relative; }
        .blog-color-dropdown { position: absolute; top: 38px; left: 0; z-index: 200; background: rgba(15,15,20,0.98); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .blog-color-picker { display: flex; flex-direction: column; gap: 12px; }
        .blog-color-presets { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
        .blog-color-presets button { width: 28px; height: 28px; border-radius: 8px; cursor: pointer; transition: transform 0.15s; }
        .blog-color-presets button:hover { transform: scale(1.15); }
        .blog-color-picker input[type="color"] { width: 100%; height: 36px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; background: none; padding: 2px; }

        /* Page Indicator */
        .blog-page-indicator { padding: 6px 32px; font-size: 0.7rem; font-weight: 800; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.1em; background: rgba(255,255,255,0.01); border-bottom: 1px solid rgba(255,255,255,0.03); }

        /* Editor */
        .blog-editor-area { flex: 1; padding: 32px; font-size: 1rem; line-height: 1.8; color: var(--gray-200); outline: none; min-height: 500px; overflow-y: auto; }
        .blog-editor-area:empty:before { content: attr(data-placeholder); color: rgba(255,255,255,0.15); pointer-events: none; }
        .blog-editor-area h1 { font-size: 2rem; font-weight: 900; margin: 24px 0 16px; }
        .blog-editor-area h2 { font-size: 1.5rem; font-weight: 800; margin: 20px 0 12px; }
        .blog-editor-area h3 { font-size: 1.25rem; font-weight: 800; margin: 16px 0 10px; }
        .blog-editor-area img { max-width: 100%; border-radius: 12px; margin: 12px 0; cursor: pointer; }
        .blog-editor-area a { color: var(--blue-light); text-decoration: underline; }
        .blog-editor-area ul, .blog-editor-area ol { padding-left: 24px; margin: 12px 0; }
        .blog-editor-area li { margin: 6px 0; }
        .blog-editor-area blockquote { border-left: 4px solid var(--blue); padding-left: 16px; margin: 16px 0; color: var(--gray-300); font-style: italic; }

        /* Modals */
        .blog-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 9000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .blog-modal-box { background: rgba(15,15,22,0.99); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 28px; width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 40px 80px rgba(0,0,0,0.7); animation: modalIn 0.25s cubic-bezier(0.175,0.885,0.32,1.275); }
        @keyframes modalIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .blog-modal-header { display: flex; align-items: center; justify-content: space-between; }
        /* Preview */
        .blog-preview-overlay { position: fixed; inset: 0; z-index: 9500; background: rgba(0,0,0,0.95); overflow-y: auto; }
        .blog-preview-container { max-width: 800px; margin: 0 auto; padding: 40px 24px 80px; }
        .blog-preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .blog-preview-header h3 { margin: 0; color: var(--gray-400); font-weight: 700; }
        .blog-preview-header button { background: rgba(255,255,255,0.08); border: none; border-radius: 12px; color: white; padding: 10px; cursor: pointer; }
        .blog-preview-cover { width: 100%; max-height: 400px; object-fit: cover; border-radius: 24px; margin-bottom: 32px; }
        .blog-preview-title { font-size: 2.5rem; font-weight: 900; margin: 0 0 16px; line-height: 1.2; }
        .blog-preview-meta { display: flex; align-items: center; gap: 20px; color: var(--gray-500); font-size: 0.85rem; font-weight: 700; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .blog-preview-meta span { display: flex; align-items: center; gap: 6px; }
        .blog-preview-content { font-size: 1.1rem; line-height: 1.9; color: var(--gray-200); }
        .blog-preview-content img { max-width: 100%; border-radius: 16px; margin: 20px 0; }
        .blog-preview-content h1, .blog-preview-content h2, .blog-preview-content h3 { color: white; margin: 32px 0 16px; }
        .blog-preview-content a { color: var(--blue-light); }

        /* Advanced Image Handling */
        .resizer-wrap { position: relative; display: inline-block; vertical-align: middle; margin: 8px; transition: all 0.2s; user-select: none; max-width: 100%; border: 2px solid transparent; border-radius: 8px; }
        .resizer-wrap.selected { border-color: var(--blue-light); }
        .resizer-wrap img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; pointer-events: none; }
        
        .img-controls { position: absolute; top: -16px; right: -16px; display: none; gap: 8px; z-index: 10; background: rgba(0,0,0,0.8); padding: 4px; border-radius: 12px; backdrop-filter: blur(4px); }
        .resizer-wrap.selected .img-controls { display: flex; }
        .img-btn { background: rgba(255,255,255,0.1); border: none; width: 28px; height: 28px; border-radius: 8px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .img-btn.del:hover { background: rgba(239,68,68,0.8); }
        
        .resize-handle { position: absolute; width: 16px; height: 16px; background: var(--blue); border: 2px solid white; border-radius: 50%; z-index: 10; display: none; }
        .resizer-wrap.selected .resize-handle { display: block; }
        .resize-handle.br { bottom: -8px; right: -8px; cursor: nwse-resize; }
        
        .drag-handle { position: absolute; top: -16px; left: -16px; display: none; width: 32px; height: 32px; background: rgba(0,0,0,0.8); border-radius: 12px; align-items: center; justify-content: center; cursor: grab; z-index: 10; color: white; }
        .resizer-wrap.selected .drag-handle { display: flex; }

        /* Mobile Optimization */
        @media (max-width: 768px) {
          .blog-editor-topbar { padding: 12px; flex-direction: column; align-items: stretch; gap: 12px; height: auto; }
          .blog-editor-title-wrap { text-align: center; }
          .blog-topbar-actions { justify-content: center; }
          .blog-editor-layout { display: flex; flex-direction: column-reverse; }
          .blog-editor-sidebar-left { border-right: none; border-top: 1px solid rgba(255,255,255,0.05); }
          .blog-toolbar { padding: 8px; gap: 4px; overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
          .blog-title-input { font-size: 1.5rem; padding: 16px; }
          .blog-editor-area { padding: 16px; font-size: 1.05rem; }
          .blog-preview-overlay { padding: 16px; }
        }
      `}</style>
    </div>
  );
};

export default BlogEditorPage;
