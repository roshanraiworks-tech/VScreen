import { useEffect, useRef, useState } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth'
import { ArrowRight, Send, Upload } from 'lucide-react'

import socket from './socket'
import { auth } from './firebase'
import AppShell from './components/layout/AppShell'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from './components/ui/Card'
import Button from './components/ui/Button'
import Input from './components/ui/Input'
import Badge from './components/ui/Badge'
// import IconButton from './components/ui/IconButton'

function App () {
  const videoRef = useRef(null)
  const isRemoteUpdateRef = useRef(false)

  const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || 'https://vscreen.onrender.com'

  // const localCallVideoRef = useRef(null)
  // const remoteCallVideoRef = useRef(null)
  // const localStreamRef = useRef(null)
  // const peerConnectionRef = useRef(null)
  // const activeCallRoomIdRef = useRef(null)

  const [authUser, setAuthUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [healthMessage, setHealthMessage] = useState(
    'Loading backend status...'
  )
  const [socketStatus, setSocketStatus] = useState('Connecting...')
  const [socketId, setSocketId] = useState('')
  const [roomName, setRoomName] = useState('')
  const [roomIdInput, setRoomIdInput] = useState('')
  const [userName, setUserName] = useState('')
  const [currentRoom, setCurrentRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [mediaList, setMediaList] = useState([])
  const [currentMedia, setCurrentMedia] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setAuthUser(user)

      if (user) {
        const fallbackName =
          user.displayName || user.email?.split('@')[0] || 'Guest'
        setUserName(fallbackName)

        const token = await user.getIdToken()
        socket.auth = { token }

        if (!socket.connected) socket.connect()
      } else {
        setUserName('')
        if (socket.connected) socket.disconnect()
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch(
          `${SERVER_URL}/api/health`
        )
        const data = await response.json()
        setHealthMessage(data.message)
      } catch (error) {
        setHealthMessage('Backend not reachable')
        console.error(error)
      }
    }

    fetchHealth()

    socket.on('connect', () => {
      setSocketStatus('Connected')
      setSocketId(socket.id)
    })

    socket.on('server:connected', data => {
      console.log('Socket event from server:', data)
    })

    socket.on('room:joined', ({ room }) => {
      setCurrentRoom(room)
      setMembers(room.members || [])
      setMediaList(room.media || [])
      setCurrentMedia(room.currentMedia || null)
      setMessages(room.messages || [])
      setIsHost(room.hostSocketId === socket.id)
    })

    socket.on('room:members', ({ members, hostSocketId }) => {
      setMembers(members || [])
      setIsHost(hostSocketId === socket.id)
      setCurrentRoom(prev => (prev ? { ...prev, hostSocketId } : prev))
    })

    socket.on('room:media', ({ media }) => {
      setMediaList(media || [])
    })

    socket.on('room:current-media', ({ currentMedia, playbackState }) => {
      isRemoteUpdateRef.current = true
      setCurrentMedia(currentMedia || null)

      if (videoRef.current && currentMedia?.url) {
        videoRef.current.src = `${SERVER_URL}${
          currentMedia.url
        }`
        videoRef.current.currentTime = playbackState?.currentTime || 0

        if (playbackState?.isPlaying) {
          videoRef.current.play().catch(() => {})
        } else {
          videoRef.current.pause()
        }
      }

      setTimeout(() => {
        isRemoteUpdateRef.current = false
      }, 200)
    })

    socket.on('room:playback', ({ playbackState }) => {
      isRemoteUpdateRef.current = true

      if (videoRef.current) {
        videoRef.current.currentTime = playbackState?.currentTime || 0

        if (playbackState?.isPlaying) {
          videoRef.current.play().catch(() => {})
        } else {
          videoRef.current.pause()
        }
      }

      setTimeout(() => {
        isRemoteUpdateRef.current = false
      }, 200)
    })

    socket.on('room:messages', ({ messages }) => {
      setMessages(messages || [])
    })

    socket.on('room:error', data => {
      alert(data.message)
    })

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected')
      setSocketId('')
    })

    return () => {
      socket.off('connect')
      socket.off('server:connected')
      socket.off('room:joined')
      socket.off('room:members')
      socket.off('room:media')
      socket.off('room:current-media')
      socket.off('room:playback')
      socket.off('room:messages')
      socket.off('room:error')
      socket.off('disconnect')
    }
  }, [])

  const signUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      setEmail('')
      setPassword('')
    } catch (error) {
      alert(error.message)
    }
  }

  const signIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setEmail('')
      setPassword('')
    } catch (error) {
      alert(error.message)
    }
  }

  const signOut = async () => {
    try {
      socket.disconnect()
      await firebaseSignOut(auth)
      setCurrentRoom(null)
      setMembers([])
      setMediaList([])
      setCurrentMedia(null)
      setMessages([])
      setIsHost(false)
    } catch (error) {
      alert(error.message)
    }
  }

  const createRoom = async () => {
    try {
      const token = await authUser.getIdToken()

      const response = await fetch(
        `${SERVER_URL}/api/rooms/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ roomName })
        }
      )

      const data = await response.json()

      if (!data.success) {
        alert('Room creation failed')
        return
      }

      const room = data.room
      setRoomName('')
      setCurrentRoom(room)

      socket.emit('room:join', {
        roomId: room.id,
        userName: userName || 'Host'
      })
    } catch (error) {
      console.error(error)
      alert('Could not create room')
    }
  }

  const joinRoom = () => {
    if (!roomIdInput.trim()) {
      alert('Enter a room ID')
      return
    }

    socket.emit('room:join', {
      roomId: roomIdInput.trim().toUpperCase(),
      userName: userName || 'Guest'
    })
  }

  const leaveRoom = () => {
    if (!currentRoom?.id) return

    socket.emit('room:leave', {
      roomId: currentRoom.id
    })

    setCurrentRoom(null)
    setMembers([])
    setMediaList([])
    setCurrentMedia(null)
    setMessages([])
    setIsHost(false)
  }

  const uploadFile = async () => {
    if (!currentRoom?.id) {
      alert('Join a room first')
      return
    }

    if (!selectedFile) {
      alert('Choose a file first')
      return
    }

    const formData = new FormData()
    formData.append('media', selectedFile)
    formData.append('roomId', currentRoom.id)
    formData.append('uploaderName', userName || 'Guest')

    try {
      const token = await authUser.getIdToken()

      const response = await fetch(
        `${SERVER_URL}/api/uploads`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      )

      const data = await response.json()

      if (!data.success) {
        alert(data.message || 'Upload failed')
        return
      }

      if (data.media?.mimeType?.startsWith('video/')) {
        setCurrentMedia(data.media)
        socket.emit('room:select-media', {
          roomId: currentRoom.id,
          mediaId: data.media.id
        })
        setActiveTab('watch')
      }

      setSelectedFile(null)
      alert('File uploaded successfully')
    } catch (error) {
      console.error(error)
      alert('Upload failed')
    }
  }

  const selectMedia = media => {
    if (!currentRoom?.id) return

    socket.emit('room:select-media', {
      roomId: currentRoom.id,
      mediaId: media.id
    })
  }

  const emitPlayback = action => {
    if (!currentRoom?.id || !videoRef.current) return

    socket.emit('room:playback', {
      roomId: currentRoom.id,
      action,
      currentTime: videoRef.current.currentTime || 0
    })
  }

  const handleSeek = () => {
    if (isRemoteUpdateRef.current || !isHost) return
    emitPlayback('seek')
  }

  const handlePlay = () => {
    if (isRemoteUpdateRef.current || !isHost) return
    emitPlayback('play')
  }

  const handlePause = () => {
    if (isRemoteUpdateRef.current || !isHost) return
    emitPlayback('pause')
  }

  const sendMessage = () => {
    if (!currentRoom?.id) {
      alert('Join a room first')
      return
    }

    const clean = chatMessage.trim()
    if (!clean) return

    socket.emit('room:message', {
      roomId: currentRoom.id,
      text: clean
    })

    setChatMessage('')
  }

  if (!authUser) {
    return (
      <div className='min-h-screen p-4 lg:p-6'>
        <div className='mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-6 lg:grid-cols-2'>
          <div className='space-y-6'>
            <Badge tone='primary'>Virtual Screen</Badge>
            <h1 className='text-5xl font-semibold tracking-tight text-white'>
              Watch together. Chat instantly. Stay perfectly in sync.
            </h1>
            <p className='max-w-xl text-base leading-7 text-slate-400'>
              A polished collaborative space for room-based media viewing, live
              chat, uploads, synchronized playback, and future video calls.
            </p>
            <div className='grid gap-4 sm:grid-cols-3'>
              <Card className='p-4'>
                <CardTitle>Rooms</CardTitle>
                <CardDescription>
                  Private or shared viewing spaces.
                </CardDescription>
              </Card>
              <Card className='p-4'>
                <CardTitle>Sync</CardTitle>
                <CardDescription>
                  Host-controlled playback for everyone.
                </CardDescription>
              </Card>
              <Card className='p-4'>
                <CardTitle>Chat</CardTitle>
                <CardDescription>Live messages while watching.</CardDescription>
              </Card>
            </div>
          </div>

          <Card className='p-6'>
            <CardHeader>
              <div>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>
                  Use your email and password to continue.
                </CardDescription>
              </div>
            </CardHeader>

            <div className='space-y-4'>
              <Input
                type='email'
                placeholder='Email'
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Input
                type='password'
                placeholder='Password'
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <div className='flex gap-3'>
                <Button onClick={signIn} className='flex-1'>
                  Sign In <ArrowRight size={16} />
                </Button>
                <Button variant='ghost' onClick={signUp} className='flex-1'>
                  Sign Up
                </Button>
              </div>
              <p className='text-sm text-slate-400'>{healthMessage}</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <AppShell
      userEmail={authUser.email}
      socketStatus={socketStatus}
      roomId={currentRoom?.id}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onSignOut={signOut}
    >
      {activeTab === 'dashboard' && (
        <div className='grid gap-6 xl:grid-cols-12'>
          <div className='xl:col-span-7 space-y-6'>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Room control</CardTitle>
                  <CardDescription>
                    Create, join, and manage your session.
                  </CardDescription>
                </div>
              </CardHeader>

              <div className='grid gap-4 md:grid-cols-3'>
                <Input
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder='Your display name'
                />
                <Input
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  placeholder='Optional room name'
                />
                <div className='flex gap-2'>
                  <Button onClick={createRoom} className='flex-1'>
                    Create
                  </Button>
                  <Button variant='ghost' onClick={joinRoom} className='flex-1'>
                    Join
                  </Button>
                </div>
              </div>

              <div className='mt-4 flex flex-wrap gap-2'>
                <Input
                  value={roomIdInput}
                  onChange={e => setRoomIdInput(e.target.value)}
                  placeholder='Enter room ID'
                  className='max-w-xs'
                />
                <Button variant='ghost' onClick={joinRoom}>
                  Join Room
                </Button>
              </div>

              {currentRoom && (
                <div className='mt-6 grid gap-4 md:grid-cols-3'>
                  <div className='vs-card-soft p-4'>
                    <p className='text-xs uppercase tracking-wider text-slate-500'>
                      Room
                    </p>
                    <p className='mt-1 text-lg font-semibold'>
                      {currentRoom.name}
                    </p>
                  </div>
                  <div className='vs-card-soft p-4'>
                    <p className='text-xs uppercase tracking-wider text-slate-500'>
                      Members
                    </p>
                    <p className='mt-1 text-lg font-semibold'>
                      {members.length}
                    </p>
                  </div>
                  <div className='vs-card-soft p-4'>
                    <p className='text-xs uppercase tracking-wider text-slate-500'>
                      Role
                    </p>
                    <p className='mt-1 text-lg font-semibold'>
                      {isHost ? 'Host' : 'Participant'}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Shared video player</CardTitle>
                  <CardDescription>
                    Select a video, then control playback from the host account.
                  </CardDescription>
                </div>
                <Badge tone={isHost ? 'success' : 'neutral'}>
                  {isHost ? 'Host control enabled' : 'View-only mode'}
                </Badge>
              </CardHeader>

              {currentMedia?.mimeType?.startsWith('video/') ? (
                <div className='space-y-4'>
                  <video
                    ref={videoRef}
                    controls={isHost}
                    className='w-full rounded-3xl border border-slate-800/80 bg-black shadow-2xl'
                    src={`${SERVER_URL}${
                      currentMedia.url
                    }`}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onSeeked={handleSeek}
                  />
                  {!isHost && (
                    <p className='text-sm text-slate-400'>
                      Only the host can control playback. Everyone else stays
                      synced.
                    </p>
                  )}
                </div>
              ) : (
                <div className='vs-card-soft flex min-h-75 items-center justify-center p-6 text-slate-400'>
                  Select a video from your uploaded media to begin watching.
                </div>
              )}
            </Card>
          </div>

          <div className='xl:col-span-5 space-y-6'>
            <Card className='h-full'>
              <CardHeader>
                <div>
                  <CardTitle>Room members</CardTitle>
                  <CardDescription>
                    See who is currently inside the room.
                  </CardDescription>
                </div>
                <Badge tone='primary'>{members.length}</Badge>
              </CardHeader>

              <div className='vs-scroll max-h-72 space-y-3 overflow-y-auto pr-2'>
                {members.length === 0 ? (
                  <div className='vs-card-soft p-4 text-sm text-slate-400'>
                    No members joined yet.
                  </div>
                ) : (
                  members.map(member => (
                    <div
                      key={member.socketId}
                      className='flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/35 px-4 py-3'
                    >
                      <span className='font-medium'>{member.userName}</span>
                      {member.socketId === currentRoom?.hostSocketId && (
                        <Badge tone='success'>Host</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>

              {currentRoom && (
                <div className='mt-5'>
                  <Button variant='ghost' onClick={leaveRoom}>
                    Leave Room
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'uploads' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Uploads</CardTitle>
              <CardDescription>
                Upload videos, images, and PDFs into the room.
              </CardDescription>
            </div>
          </CardHeader>

          <div className='flex flex-col gap-3 md:flex-row md:items-center'>
            <Input
              type='file'
              accept='image/*,video/*,application/pdf'
              onChange={e => setSelectedFile(e.target.files[0])}
              className='file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-white'
            />
            <Button onClick={uploadFile}>
              <Upload size={16} /> Upload
            </Button>
          </div>

          <div className='mt-5 grid gap-3'>
            {mediaList.length === 0 ? (
              <div className='vs-card-soft p-4 text-sm text-slate-400'>
                No media uploaded yet.
              </div>
            ) : (
              mediaList.map(item => {
                const fileUrl = `${SERVER_URL}${item.url}`
                const isVideo = item.mimeType?.startsWith('video/')
                // const isImage = item.mimeType?.startsWith('image/')
                // const isPdf = item.mimeType === 'application/pdf'

                const handleView = () => {
                  window.open(fileUrl, '_blank', 'noopener,noreferrer')
                }

                return (
                  <div
                    key={item.id}
                    className='flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/35 p-4 md:flex-row md:items-center md:justify-between'
                  >
                    <div className='min-w-0'>
                      <p className='truncate font-medium text-white'>
                        {item.title}
                      </p>
                      <p className='text-sm text-slate-400'>
                        {item.uploadedBy} • {item.mimeType}
                      </p>
                    </div>

                    <div className='flex flex-wrap gap-2'>
                      <Button variant='ghost' onClick={handleView}>
                        View
                      </Button>

                      {isVideo && (
                        <Button
                          variant='ghost'
                          onClick={() => {
                            selectMedia(item)
                            setActiveTab('watch')
                          }}
                        >
                          Watch in Room
                        </Button>
                      )}
                      {/* {isImage && (
                        <Button
                          variant='ghost'
                          onClick={() => selectMedia(item)}
                        >
                          View
                        </Button>
                      )}
                      {isPdf && (
                        <Button
                          variant='ghost'
                          onClick={() => selectMedia(item)}
                        >
                          View
                        </Button>
                      )} */}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      )}

      {activeTab === 'chat' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Live chat</CardTitle>
              <CardDescription>
                Talk while the room is watching.
              </CardDescription>
            </div>
            <Badge tone='primary'>Real-time</Badge>
          </CardHeader>

          <div className='vs-scroll mb-4 h-[55vh] space-y-3 overflow-y-auto pr-2'>
            {messages.length === 0 ? (
              <div className='vs-card-soft p-4 text-sm text-slate-400'>
                No messages yet.
              </div>
            ) : (
              messages.map(msg => {
                const isOwnMessage = msg.socketId === socketId

                return (
                  <div
                    key={msg.id}
                    className={`flex w-full ${
                      isOwnMessage ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl border px-4 py-3 ${
                        isOwnMessage
                          ? 'border-violet-500/30 bg-violet-500/15 text-right'
                          : 'border-slate-800/80 bg-slate-950/35 text-left'
                      }`}
                    >
                      <div className='mb-1 flex items-center justify-between gap-3 text-xs text-slate-500'>
                        <span className='font-semibold text-slate-300'>
                          {msg.userName}
                        </span>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className='text-sm text-slate-100'>{msg.text}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className='flex gap-2'>
            <Input
              value={chatMessage}
              onChange={e => setChatMessage(e.target.value)}
              placeholder='Type a message...'
              onKeyDown={e => {
                if (e.key === 'Enter') sendMessage()
              }}
            />
            <Button onClick={sendMessage}>
              <Send size={16} /> Send
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'watch' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Watch Room</CardTitle>
              <CardDescription>
                Select a room video and control playback here.
              </CardDescription>
            </div>
          </CardHeader>

          <div className='space-y-4'>
            {currentMedia?.mimeType?.startsWith('video/') ? (
              <div className='vs-video-shell'>
                <video
                  ref={videoRef}
                  controls={isHost}
                  className='vs-video-player'
                  src={`${SERVER_URL}${currentMedia.url}`}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeeked={handleSeek}
                />
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='vs-card-soft flex min-h-[300px] items-center justify-center p-6 text-slate-400'>
                  No video selected yet. Choose a video below.
                </div>

                <div className='grid gap-3'>
                  {mediaList
                    .filter(item => item.mimeType?.startsWith('video/'))
                    .map(item => (
                      <div
                        key={item.id}
                        className='flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/35 p-4'
                      >
                        <div>
                          <p className='font-medium text-white'>{item.title}</p>
                          <p className='text-sm text-slate-400'>
                            {item.uploadedBy}
                          </p>
                        </div>
                        <Button
                          variant='ghost'
                          onClick={() => {
                            selectMedia(item)
                          }}
                        >
                          Watch
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Card>
        // <Card>
        //   <CardHeader>
        //     <div>
        //       <CardTitle>Watch Room</CardTitle>
        //       <CardDescription>
        //         Select a room video and control playback here.
        //       </CardDescription>
        //     </div>
        //   </CardHeader>

        //   <div className='space-y-4'>
        //     {currentMedia?.mimeType?.startsWith('video/') ? (
        //       <video
        //         ref={videoRef}
        //         controls={isHost}
        //         className='w-full rounded-3xl border border-slate-800/80 bg-black shadow-2xl'
        //         src={`${import.meta.env.VITE_SERVER_URL}${currentMedia.url}`}
        //         onPlay={handlePlay}
        //         onPause={handlePause}
        //         onSeeked={handleSeek}
        //       />
        //     ) : (
        //       <div className='vs-card-soft flex min-h-75 items-center justify-center p-6 text-slate-400'>
        //         No video selected yet. Go to Uploads or Dashboard first.
        //       </div>
        //     )}
        //   </div>
        // </Card>
      )}

      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Firebase login and backend verification status.
              </CardDescription>
            </div>
          </CardHeader>
          <div className='vs-card-soft p-6 text-slate-300'>
            Signed in as {authUser.email}
          </div>
        </Card>
      )}
    </AppShell>
  )
}

export default App
