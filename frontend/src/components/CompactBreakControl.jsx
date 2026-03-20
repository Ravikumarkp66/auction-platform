"use client"

import { useState, useEffect, useRef } from "react"

export default function CompactBreakControl({ socket, onBreakStart, onBreakEnd, onViewSquads }) {
  const [showModal, setShowModal] = useState(false)
  const [breakType, setBreakType] = useState('lunch')
  const [customReason, setCustomReason] = useState('')
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)
  const [isBreakActive, setIsBreakActive] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!socket) return

    // 1. Request current status on mount
    socket.emit('getBreakStatus')

    // 2. Listen for status
    socket.on('breakStatus', (data) => {
      if (data && data.isActive) {
        setBreakType(data.type || 'short')
        setCustomReason(data.customReason || '')
        
        const now = Date.now()
        const msLeft = data.endTime - now
        if (msLeft > 0) {
          setIsBreakActive(true)
          const secs = Math.ceil(msLeft / 1000)
          setRemainingTime(secs)
          startLocalCountdown(secs)
        }
      } else {
        setIsBreakActive(false)
      }
    })

    // 3. Listen for external start/end
    socket.on('breakTime', (data) => {
      setBreakType(data.type)
      setCustomReason(data.customReason || '')
      setIsBreakActive(true)
      setRemainingTime(data.totalSeconds)
      startLocalCountdown(data.totalSeconds)
    })

    socket.on('breakTimeEnd', () => {
      setIsBreakActive(false)
      if (timerRef.current) clearInterval(timerRef.current)
      setRemainingTime(0)
    })

    return () => {
      socket.off('breakStatus')
      socket.off('breakTime')
      socket.off('breakTimeEnd')
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [socket])

  const startLocalCountdown = (secs) => {
    if (timerRef.current) clearInterval(timerRef.current)
    
    const targetTime = Date.now() + (secs * 1000)
    
    timerRef.current = setInterval(() => {
      const now = Date.now()
      const diff = Math.max(0, Math.ceil((targetTime - now) / 1000))
      
      setRemainingTime(diff)
      
      if (diff <= 0) {
        clearInterval(timerRef.current)
        setIsBreakActive(false)
      }
    }, 1000)
  }

  const breakTypes = [
    { id: 'lunch', icon: '🍽️', label: 'Lunch Break', defaultMinutes: 30 },
    { id: 'tea', icon: '☕', label: 'Tea Break', defaultMinutes: 15 },
    { id: 'short', icon: '⏸️', label: 'Short Break', defaultMinutes: 5 },
    { id: 'technical', icon: '🔧', label: 'Technical Break', defaultMinutes: 10 },
    { id: 'custom', icon: '📝', label: 'Custom Break', defaultMinutes: 5 }
  ]

  const startBreak = () => {
    const totalSeconds = (minutes * 60) + seconds
    if (totalSeconds <= 0) return

    const breakData = {
      type: breakType,
      duration: Math.ceil(totalSeconds / 60),
      customReason: breakType === 'custom' ? customReason : undefined,
      totalSeconds
    }

    // Emit break event via socket to all connected clients (including overlay)
    if (socket) {
      socket.emit('breakTime', breakData)
    }
    
    setShowModal(false)
    onBreakStart?.(breakData)
  }

  const endBreak = () => {
    if (!socket) return
    socket.emit('breakTimeEnd')
    setIsBreakActive(false)
    setRemainingTime(0)
    onBreakEnd?.()
  }

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const selectedBreak = breakTypes.find(b => b.id === breakType)

  return (
    <>
      {/* Control Buttons - Now inline with header */}
      <div className="flex items-center gap-2">
        {/* View Squads Button */}
        {onViewSquads && (
          <button
            onClick={onViewSquads}
            className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 transition-all border border-sky-500/30 min-h-[40px]"
          >
            <span className="text-xl">👥</span>
            <span className="font-bold text-sm">View Squads</span>
          </button>
        )}
        
        {/* Break Button */}
        {!isBreakActive ? (
          <button
            onClick={() => setShowModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all border border-orange-500/30 whitespace-nowrap backdrop-blur-md min-h-[40px] flex items-center shadow-lg"
          >
            <span className="text-lg mr-2">⏰</span>
            <span className="font-bold text-sm">Break</span>
          </button>
        ) : (
          <div className="bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-3 border border-red-500/30 min-h-[40px]">
            <span className="text-lg animate-pulse">{selectedBreak?.icon || '⏰'}</span>
            <span className="font-black text-sm tracking-tighter tabular-nums">{formatTime(remainingTime)}</span>
            <button
              onClick={endBreak}
              className="px-2 py-1 bg-white text-red-600 hover:bg-red-50 text-[10px] font-black uppercase rounded shadow-sm transition-all"
            >
              End
            </button>
          </div>
        )}
      </div>

      {/* Break Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>⏰</span>
              Start Break
            </h3>

            {/* Break Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Break Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {breakTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setBreakType(type.id)
                      setMinutes(type.defaultMinutes)
                      setSeconds(0)
                    }}
                    className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                      breakType === type.id
                        ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                        : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason */}
            {breakType === 'custom' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Custom Reason
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom break reason..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            {/* Time Duration */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Duration
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="text-2xl text-slate-400 pb-6">:</div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Seconds</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={seconds}
                    onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Set Buttons */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Quick Set
              </label>
              <div className="flex gap-2">
                {[1, 5, 10, 15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setMinutes(mins)
                      setSeconds(0)
                    }}
                    className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-slate-300 hover:border-orange-500 hover:text-orange-400 transition-all"
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={startBreak}
                disabled={!socket || (minutes === 0 && seconds === 0)}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <span>{selectedBreak?.icon}</span>
                Start {selectedBreak?.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
