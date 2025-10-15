import React, { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(false);

  const backendURL = "http://localhost:8000";

  // 🔹 Fetch uploaded files from backend
  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${backendURL}/files`);
      if (res.data.ok) setUploadedFiles(res.data.files);
    } catch (err) {
      console.error("Error fetching files", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileChange = (e) => setFiles(e.target.files);

  const handleUpload = async () => {
    if (!files.length) return alert("Select a file first!");
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
    try {
      setLoading(true);
      const res = await axios.post(`${backendURL}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(`✅ Uploaded & indexed chunks: ${res.data.indexed_chunks}`);
      fetchFiles(); // refresh dashboard
    } catch {
      alert("Upload failed!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete ${filename}?`)) return;
    try {
      await axios.delete(`${backendURL}/files/${filename}`);
      fetchFiles();
    } catch {
      alert("Delete failed!");
    }
  };

  const handleQuery = async () => {
    if (!query) return alert("Type a query first!");
    try {
      setLoading(true);
      const res = await axios.post(`${backendURL}/query`, { query, k: 5 });
      setAnswer(res.data.answer);
      setCitations(res.data.citations || []);
    } catch {
      alert("Query failed!");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    await axios.post(`${backendURL}/reset`);
    alert("Knowledge index reset!");
    setAnswer("");
    setCitations([]);
    setUploadedFiles([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
      {/* Navbar */}
      <header className="backdrop-blur bg-white/40 shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-indigo-600">📚 Knowledge Q&A</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Upload Section */}
        <div className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">📤 Upload Documents</h2>
          <div className="flex items-center gap-3">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="border rounded-lg px-3 py-2 w-full"
            />
            <button
              onClick={handleUpload}
              className="bg-indigo-500 hover:bg-indigo-600 hover:scale-105 text-white px-4 py-2 rounded-xl shadow-md transition-all"
            >
              Upload
            </button>
            <button
              onClick={handleReset}
              className="bg-red-500 hover:bg-red-600 hover:scale-105 text-white px-4 py-2 rounded-xl shadow-md transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Dashboard Section */}
        <div className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">📑 Uploaded Documents</h2>
          {uploadedFiles.length === 0 ? (
            <p className="text-gray-500">No files uploaded yet.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-indigo-100">
                  <th className="p-2 border">File Name</th>
                  <th className="p-2 border">Chunks</th>
                  <th className="p-2 border">Uploaded At</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploadedFiles.map((file, i) => (
                  <tr key={i} className="hover:bg-indigo-50">
                    <td className="p-2 border">{file.name}</td>
                    <td className="p-2 border text-center">{file.chunks}</td>
                    <td className="p-2 border">{file.uploadedAt || "N/A"}</td>
                    <td className="p-2 border">
                      <button
                        onClick={() => handleDelete(file.name)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-md transition-all"
                      >
                        ❌ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Query Section */}
        <div className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">❓ Ask a Question</h2>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 focus:ring-2 focus:ring-indigo-400 outline-none transition"
            placeholder="Type your question..."
            rows={3}
          />
          <button
            onClick={handleQuery}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 hover:scale-105 text-white px-6 py-2 rounded-xl shadow-md transition-all"
          >
            {loading ? "Loading..." : "Ask"}
          </button>
        </div>

        {/* Answer Section */}
        {answer && (
          <div className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">💡 Answer</h2>
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg mb-4">
              <p className="text-gray-800">{answer}</p>
            </div>
            <h3 className="font-semibold mb-2 text-gray-700">📎 Citations:</h3>
            <ul className="list-disc ml-6 text-gray-600 space-y-1">
              {citations.map((c, i) => (
                <li key={i}>
                  <strong>{c.source}</strong> (chunk {c.chunk}): {c.text.slice(0, 100)}...
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
