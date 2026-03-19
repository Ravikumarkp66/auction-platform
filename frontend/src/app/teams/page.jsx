"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"

export default function TeamsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const tournamentId = searchParams.get('tournament')

  // Fetch teams from backend
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        // If tournamentId is provided, use it; otherwise fetch active tournament
        let targetTournamentId = tournamentId
        let activeTournamentData = null
        
        if (!targetTournamentId) {
          console.log('No tournament ID provided, fetching active tournament...')
          const activeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/status/active`)
          if (activeRes.ok) {
            const activeData = await activeRes.json()
            console.log('Active tournament response:', activeData)
            if (activeData && activeData.tournament) {
              targetTournamentId = activeData.tournament._id
              activeTournamentData = activeData
              console.log('Found active tournament:', targetTournamentId)
            } else if (activeData && activeData._id) {
              // Handle case where tournament is returned directly
              targetTournamentId = activeData._id
              activeTournamentData = { tournament: activeData, teams: activeData.teams || [], players: activeData.players || [] }
              console.log('Found active tournament (direct):', targetTournamentId)
            }
          }
        }
        
        if (!targetTournamentId) {
          console.log('No tournament ID available')
          setLoading(false)
          return
        }
        
        console.log('Fetching teams for tournament:', targetTournamentId)
        
        // Fetch tournament data which includes teams
        let res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${targetTournamentId}`)
        
        if (res.ok) {
          const data = await res.json()
          console.log('Tournament data:', data)
          
          // API returns { tournament, teams, players }
          if (data.teams && data.teams.length > 0) {
            console.log('Found teams:', data.teams.length)
            const teamsWithLogos = data.teams.map(team => ({
              ...team,
              logo: team.logoUrl || team.logo,
              purse: team.remainingBudget || 0,
              squad: data.players?.filter(p => p.team === team._id) || []
            }))
            setTeams(teamsWithLogos)
            setLoading(false)
            return
          }
        }
        
        // Fallback to teams API
        console.log('Tournament data empty, trying teams API...')
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/tournament/${targetTournamentId}`)
        
        if (res.ok) {
          const data = await res.json()
          console.log('Teams from API:', data.length)
          const teamsWithLogos = data.map(team => ({
            ...team,
            logo: team.logoUrl || team.logo,
            purse: team.remainingBudget || 0
          }))
          setTeams(teamsWithLogos)
          setLoading(false)
          return
        }
        
        console.log('No teams found')
        setTeams([])
        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch teams:', err)
        setError('Failed to load teams')
        setLoading(false)
      }
    }

    fetchTeams()
  }, [tournamentId])


  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading teams...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link 
            href="/live-auction" 
            className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors"
          >
            Back to Auction
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
        padding: '16px 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>Select Team</h1>
          <Link 
            href={tournamentId ? `/live-auction?id=${tournamentId}` : "/auctions"}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 'bold',
              textDecoration: 'none',
              border: '1px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#059669'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#10b981'
            }}
          >
            ← Back to Auction
          </Link>
        </div>
      </div>

      {/* Teams Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '24px',
        padding: '40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {teams.map((team, index) => (
          <div
            key={team._id}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(71, 85, 105, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden',
              animation: `slideUp 0.4s ease-out ${index * 0.1}s both`
            }}
            onClick={() => router.push(`/team/${team._id}`)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)'
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.3)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid rgba(71, 85, 105, 0.5)',
                transition: 'all 0.3s ease'
              }}>
                <Image
                  src={team.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random`}
                  alt={team.name}
                  width={80}
                  height={80}
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  marginTop: '12px',
                  marginBottom: '4px',
                  color: '#f1f5f9'
                }}>{team.name}</h3>
                <p style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  margin: '0 0 4px 0'
                }}>{(team.squad?.length || 0) === 0 ? '0 Players' : `${team.squad?.length || 0}/11 Players`}</p>
                <p style={{
                  fontSize: '12px',
                  color: '#10b981',
                  fontWeight: 'bold',
                  margin: '0'
                }}>₹{team.purse?.toLocaleString() || team.remainingBudget?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {teams.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>👥</div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#f1f5f9',
            marginBottom: '8px'
          }}>No Teams Found</h2>
          <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '24px' }}>
            Create teams first to view their squads.
          </p>
          <Link 
            href="/auction" 
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '8px 24px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 'bold',
              textDecoration: 'none',
              border: '1px solid #10b981',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#059669'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#10b981'
            }}
          >
            Create Teams
          </Link>
        </div>
      )}

      {/* Add animation keyframes */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
