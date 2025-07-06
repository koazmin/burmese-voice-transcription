import { useState, useRef } from 'react';
import { FaMicrophone, FaStop, FaCopy, FaSave, FaQuestionCircle } from 'react-icons/fa';
import { RecordRTCPromisesHandler } from '@cnakazawa/react-mic';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [editedTranscription, setEditedTranscription] = useState('');
  const [template, setTemplate] = useState('general');
  const [queryResponse, setQueryResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current = new RecordRTCPromisesHandler(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        timeSlice: 60000, // Split into 60-second chunks
        ondataavailable: async (blob) => {
          audioChunksRef.current.push(blob);
        },
      });
      await recorderRef.current.startRecording();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      await recorderRef.current.stopRecording();
      setIsRecording(false);
      const blob = await recorderRef.current.getBlob();
      audioChunksRef.current.push(blob);
      await transcribeAudio();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
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

  const downloadAudio = async () => {
    if (recorderRef.current) {
      const blob = await recorderRef.current.getBlob();
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
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded ${isRecording ? 'bg-red-500' : 'bg-green-500'} text-white`}
          disabled={isProcessing}
        >
          {isRecording ? <FaStop /> : <FaMicrophone />} {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <button
          onClick={downloadAudio}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
          disabled={isRecording || !recorderRef.current}
        >
          Download Audio
        </button>
      </div>
      <div className="mb-4">
        <label className="block mb-2">Select Template:</label>
        <select
          value={template}
          onChange={(e) => setTemplate
