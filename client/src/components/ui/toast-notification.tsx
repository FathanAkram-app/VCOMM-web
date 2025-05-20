import React, { forwardRef, useEffect, useState } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, MessageSquare, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'wouter/use-location'

const notificationVariants = cva(
  "group pointer-events-auto relative flex w-full max-w-md items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border bg-background",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success: "border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-700",
        message: "border-green-700 bg-background text-foreground dark:bg-black/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface NotificationProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationVariants> {
  message: string
  sender: string
  timestamp: Date
  conversationId: number
  isGroup: boolean
  onClose?: () => void
}

const ToastNotification = forwardRef<HTMLDivElement, NotificationProps>(
  ({ className, variant = "message", message, sender, timestamp, conversationId, isGroup, onClose, ...props }, ref) => {
    const navigate = useNavigate()
    const [timeAgo, setTimeAgo] = useState('')
    
    useEffect(() => {
      const updateTimeAgo = () => {
        const now = new Date()
        const diffSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000)
        
        if (diffSeconds < 60) {
          setTimeAgo(`${diffSeconds} detik yang lalu`)
        } else if (diffSeconds < 3600) {
          const minutes = Math.floor(diffSeconds / 60)
          setTimeAgo(`${minutes} menit yang lalu`)
        } else {
          const hours = Math.floor(diffSeconds / 3600)
          setTimeAgo(`${hours} jam yang lalu`)
        }
      }
      
      updateTimeAgo()
      const interval = setInterval(updateTimeAgo, 30000) // Update tiap 30 detik
      
      return () => clearInterval(interval)
    }, [timestamp])

    const truncateMessage = (text: string, maxLength = 60) => {
      if (text.length <= maxLength) return text
      return `${text.substring(0, maxLength)}...`
    }
    
    const handleView = () => {
      // Navigate to the chat
      navigate(`/chat/${conversationId}${isGroup ? '?isRoom=true' : ''}`)
      
      // Close the notification
      if (onClose) {
        onClose()
      }
    }
    
    return (
      <div
        ref={ref}
        className={cn(notificationVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start space-x-3 w-full">
          <div className="bg-primary rounded-full p-1.5 text-primary-foreground">
            {isGroup ? <Users size={18} /> : <User size={18} />}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div className="font-medium">{sender}</div>
              <div className="text-xs text-muted-foreground">{timeAgo}</div>
            </div>
            <div className="flex items-center mt-1 text-sm">
              <MessageSquare className="h-4 w-4 mr-1 opacity-70" />
              <span>{truncateMessage(message)}</span>
            </div>
            <div className="mt-2 flex justify-end space-x-2">
              <button 
                onClick={onClose}
                className="text-xs px-3 py-1 rounded-md hover:bg-accent transition-colors"
              >
                Tutup
              </button>
              <button 
                onClick={handleView}
                className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Lihat
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    )
  }
)

ToastNotification.displayName = "ToastNotification"

export { ToastNotification }