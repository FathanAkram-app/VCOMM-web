/**
 * Modal untuk panggilan masuk
 * Komponen ini menampilkan popup notifikasi saat ada panggilan masuk
 * dengan opsi untuk menerima atau menolak panggilan
 */
interface IncomingCallModalProps {
  callerName: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  callerName,
  callType,
  onAccept,
  onReject
}: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-zinc-800 border border-green-900 rounded-lg shadow-lg animate-pop-in overflow-hidden">
        <div className="bg-green-900/50 p-4 text-center">
          <h3 className="text-lg font-bold text-white">Panggilan Masuk</h3>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-800 flex items-center justify-center mb-4 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {callType === 'audio' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                )}
              </svg>
            </div>
            <h4 className="text-xl font-bold text-white">{callerName}</h4>
            <p className="text-zinc-400">
              {callType === 'audio' ? 'Panggilan Audio' : 'Panggilan Video'}
            </p>
          </div>
          
          <div className="flex justify-between gap-4">
            <button
              onClick={onReject}
              className="flex-1 py-3 bg-red-800 hover:bg-red-700 rounded-md text-white font-medium flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Tolak
            </button>
            
            <button
              onClick={onAccept}
              className="flex-1 py-3 bg-green-700 hover:bg-green-600 rounded-md text-white font-medium flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Terima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}