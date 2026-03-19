"use client"

import { useState } from "react"

export default function BreakControlPanel({ socket, onBreakStart, onBreakEnd }) {
  const [breakType, setBreakType] = useState('short')
  const [customReason, setCustomReason] = useState('')
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)
  const [isBreakActive, setIsBreakActive] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  const breakReasons = {
    lunch: {
      icon: '🍽️',
      label: 'Lunch Break',
      defaultMinutes: 30,
      color: 'orange'
    },
    tea: {
      icon: '☕',
      label: 'Tea Break',
      defaultMinutes: 15,
      color: 'amber'
    },
    short: {
      icon: '⏸️',
      label: 'Short Break',
      defaultMinutes: 5,
      color: 'blue'
    },
    technical: {
      icon: '🔧',
      label: 'Technical Break',
      defaultMinutes: 10,
      color: 'red'
    },
    custom: {
      icon: '📝',
      label: 'Custom Break',
      defaultMinutes: 5,
      color: 'purple'
    }
  }

  const startBreak = () => {
    if (!socket) return

    const totalSeconds = (minutes * 60) + seconds
    if (totalSeconds <= 0) return

    const breakData = {
      type: breakType,
      duration: Math.ceil(totalSeconds / 60), // minutes (for display / fallback)
      customReason: breakType === 'custom' ? customReason : undefined,
      totalSeconds // exact seconds for backend / overlay
    }

    // Send full break data (including seconds) to backend
    socket.emit('breakTime', breakData)
    setIsBreakActive(true)
    setRemainingTime(totalSeconds)
    onBreakStart?.(breakData)

    // Start countdown
    const countdownInterval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          endBreak()
          return 0
        }
        return prev - 1
      })
    }, 1000)
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

  const selectedBreak = breakReasons[breakType]

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-2xl">⏰</span>
        Break Control Panel
      </h3>

      {!isBreakActive ? (
        <div className="space-y-6">
          {/* Break Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Break Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(breakReasons).map(([key, reason]) => (
                <button
                  key={key}
                  onClick={() => {
                    setBreakType(key)
                    setMinutes(reason.defaultMinutes)
                    setSeconds(0)
                  }}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                    breakType === key
                      ? `border-${reason.color}-500 bg-${reason.color}-500/10 text-${reason.color}-400`
                      : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-xl">{reason.icon}</span>
                  <span className="text-sm font-medium">{reason.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Reason Input */}
          {breakType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Custom Reason
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter custom break reason..."
                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          {/* Time Duration */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Duration
            </label>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white text-center focus:outline-none focus:border-violet-500"
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
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white text-center focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Duration Buttons */}
          <div>
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
                  className="px-3 py-1 bg-slate-800 border border-slate-600 rounded-lg text-xs text-slate-300 hover:border-violet-500 hover:text-violet-400 transition-all"
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Start Break Button */}
          <button
            onClick={startBreak}
            disabled={!socket || (minutes === 0 && seconds === 0)}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span>{selectedBreak.icon}</span>
            Start {selectedBreak.label}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Break Display */}
          <div className="text-center p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-2xl">
            <div className="text-4xl mb-2">{selectedBreak.icon}</div>
            <h4 className="text-xl font-bold text-orange-400 mb-2">
              {selectedBreak.label}
            </h4>
            {breakType === 'custom' && customReason && (
              <p className="text-slate-300 mb-4">{customReason}</p>
            )}
            <div className="text-5xl font-mono font-bold text-white mb-4">
              {formatTime(remainingTime)}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 mb-4">
              <div 
                className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${((minutes * 60 + seconds - remainingTime) / (minutes * 60 + seconds)) * 100}%` }}
              />
            </div>
            <p className="text-slate-400 text-sm">
              Break in progress...
            </p>
          </div>

          {/* End Break Button */}
          <button
            onClick={endBreak}
            disabled={!socket}
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-violet-500 hover:from-violet-600 hover:to-violet-600 disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span>✅</span>
            End Break Early
          </button>
        </div>
      )}
    </div>
  )
}
