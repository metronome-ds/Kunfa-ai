'use client'

import { useState, useRef, useCallback } from 'react'

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob | null) => void
  recording: Blob | null
}

export default function VoiceRecorder({ onRecordingComplete, recording }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecordingComplete(blob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setSeconds(0)

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 59) {
            stopRecording()
            return 60
          }
          return prev + 1
        })
      }, 1000)
    } catch {
      alert('Unable to access microphone. Please check permissions.')
    }
  }, [onRecordingComplete, stopRecording])

  const clearRecording = useCallback(() => {
    onRecordingComplete(null)
    setSeconds(0)
  }, [onRecordingComplete])

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`upload-zone ${isRecording ? 'border-red-400 bg-red-50' : recording ? 'border-kunfa-green bg-emerald-50' : ''}`}>
      {recording ? (
        <div className="flex items-center justify-center gap-3">
          <svg className="w-5 h-5 text-kunfa-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium text-kunfa-navy">Voice note recorded ({formatTime(seconds)})</span>
          <button
            onClick={clearRecording}
            className="text-gray-400 hover:text-red-500 ml-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : isRecording ? (
        <div className="text-center cursor-pointer" onClick={stopRecording}>
          <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-2 animate-pulse" />
          <p className="text-sm font-medium text-red-600">Recording... {formatTime(seconds)}</p>
          <p className="text-xs text-red-400 mt-1">Tap to stop</p>
        </div>
      ) : (
        <div className="cursor-pointer" onClick={startRecording}>
          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
          </svg>
          <p className="text-sm font-medium text-kunfa-navy">Tap to record a 60-second pitch</p>
          <p className="text-xs text-kunfa-text-secondary mt-1">Voice note (max 60s)</p>
        </div>
      )}
      <div className="mt-2">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          OPTIONAL
        </span>
      </div>
    </div>
  )
}
