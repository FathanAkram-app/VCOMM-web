export default function TestLogin() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-4xl font-bold mb-4">TEST LOGIN PAGE</h1>
        <p className="text-xl">NXZZ-VComm Military Communications</p>
        <div className="mt-8 space-y-4">
          <input 
            type="text" 
            placeholder="Callsign" 
            className="block w-64 mx-auto p-2 bg-gray-800 text-white border border-gray-600 rounded"
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="block w-64 mx-auto p-2 bg-gray-800 text-white border border-gray-600 rounded"
          />
          <button className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            LOGIN
          </button>
        </div>
      </div>
    </div>
  );
}