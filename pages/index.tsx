import { useState, useRef } from 'react';
import { FaCopy, FaSave, FaQuestionCircle } from 'react-icons/fa';
import { AudioRecorder } from 'react-audio-voice-recorder';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [editedTranscription, setEditedTranscription] = useState('');
  const [template, setTemplate] = useState('general');
  const [queryResponse, setQueryResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const audioChunksRef = useRef<Blob[]>([]);

  const addAudioElement = async (blob: Blob) => {
    audioChunksRef.current.push(blob);
    setIsRecording(false);
    await transcribeAudio();
  };

  const startRecording = () => {
    setIsRecording(true);
    audioChunksRef.current = []; // Reset chunks on new recording
  };

  const transcribeAudio = async () => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      audioChunksRef.current.forEach((chunk, index) => {
        formData.append(`audio${index}`, chunk, `audio${index}.webm`);
      });
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setTranscription(data.transcription);
      setEditedTranscription(data.transcription);
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscription('Error transcribing audio.');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const saveToNotion = async () => {
    try {
      const response = await fetch('/api/save-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription: editedTranscription, template }),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      alert('Saved to Notion successfully!');
    } catch (error) {
      console.error('Error saving to Notion:', error);
      alert('Error saving to Notion.');
    }
  };

  const queryGemini = async () => {
    try {
      const response = await fetch('/api/query-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editedTranscription }),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setQueryResponse(data.response);
    } catch (error) {
      console.error('Query error:', error);
      setQueryResponse('Error querying Gemini.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedTranscription);
    alert('Transcription copied to clipboard!');
  };

  const downloadAudio = () => {
    if (audioChunksRef.current.length > 0) {
      const blob = audioChunksRef.current[audioChunksRef.current.length - 1];
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recording.webm';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Burmese Voice Transcription</h1>
      <div className="mb-4">
        <AudioRecorder
          onRecordingComplete={addAudioElement}
          onStart={startRecording}
          audioTrackConstraints={{
            echoCancellation: true,
            noiseSuppression: true,
          }}
          downloadFileExtension="webm"
        />
        <button
          onClick={downloadAudio}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
          disabled={isRecording || audioChunksRef.current.length === 0}
        >
          Download Audio
        </button>
      </div>
      <div className="mb-4">
        <label className="block mb-2">Select Template:</label>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="general">General</option>
          <option value="meeting_notes">Meeting Notes</option>
          <option value="brainstorming_ideas">Brainstorming Ideas</option>
          <option value="quick_notes">Quick Notes</option>
          <option value="summary">Summary</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block mb-2">Transcription:</label>
        <textarea
          value={editedTranscription}
          onChange={(e) => setEditedTranscription(e.target.value)}
          className="border p-2 rounded w-full h-32"
          placeholder="Transcription will appear here..."
        />
        <div className="mt-2">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-gray-500 text-white rounded mr-2"
            disabled={!editedTranscription}
          >
            <FaCopy /> Copy
          </button>
          <button
            onClick={saveToNotion}
            className="px-4 py-2 bg-blue-500 text-white rounded"
            disabled={!editedTranscription || isProcessing}
          >
            <FaSave /> Save to Notion
          </button>
        </div>
      </div>
      <div className="mb-4">
        <button
          onClick={queryGemini}
          className="px-4 py-2 bg-purple-500 text-white rounded"
          disabled={!editedTranscription || isProcessing}
        >
          <FaQuestionCircle /> Query Gemini
        </button>
      </div>
      {queryResponse && (
        <div className="mb-4">
          <label className="block mb-2">Gemini Response:</label>
          <textarea
            value={queryResponse}
            readOnly
            className="border p-2 rounded w-full h-32"
          />
        </div>
      )}
      {isProcessing && <div className="text-center">Processing...</div>}
    </div>
  );
}
