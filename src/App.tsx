import React, { useState, useEffect } from 'react';
import { Thermometer, Droplets, Sun, Flower, Camera } from 'lucide-react';
import { supabase } from './lib/supabase';

type SensorData = {
  temperature: number;
  soil_moisture: number;
  humidity: number;
  light: number;
};

function CircularProgress({ 
  value, 
  label, 
  icon: Icon,
  color,
  unit = '%'
}: { 
  value: number; 
  label: string; 
  icon: React.ElementType;
  color: string;
  unit?: string;
}) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="flex flex-col items-center p-4">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-8 h-8 mb-2" />
          <span className="text-2xl font-bold">{value}{unit}</span>
          <span className="text-gray-600 text-sm">{label}</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 0,
    soil_moisture: 0,
    humidity: 0,
    light: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    // Function to fetch the latest sensor data
    const fetchSensorData = async () => {
      try {
        const { data, error } = await supabase
          .from('sensor')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        if (data) {
          setSensorData({
            temperature: data.temperature,
            soil_moisture: data.soil_moisture,
            humidity: data.humidity,
            light: data.light
          });
        }
      } catch (error) {
        console.error('Error fetching sensor data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch sensor data');
      }
    };

    // Fetch initial data
    fetchSensorData();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('sensor_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor'
        },
        (payload) => {
          const newData = payload.new as SensorData;
          setSensorData(newData);
        }
      )
      .subscribe();

    // Fetch data every 30 seconds as a fallback
    const interval = setInterval(fetchSensorData, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const captureImage = async () => {
    try {
      setUploading(true);
      const response = await fetch('http://192.168.0.102:8080/shot.jpg');
      const blob = await response.blob();
      const filename = `image-${Date.now()}.jpg`;
      
      const { error } = await supabase.storage
        .from('img')
        .upload(filename, blob);

      if (error) throw error;

      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error capturing or uploading image:', error);
      alert('Failed to capture or upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Plant Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time sensor data</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-4 transition-transform hover:scale-105">
            <CircularProgress
              value={sensorData.temperature}
              label="Temperature"
              icon={Thermometer}
              color="text-red-500"
              unit="°C"
            />
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 transition-transform hover:scale-105">
            <CircularProgress
              value={sensorData.soil_moisture}
              label="Soil Moisture"
              icon={Flower}
              color="text-blue-500"
            />
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 transition-transform hover:scale-105">
            <CircularProgress
              value={sensorData.humidity}
              label="Humidity"
              icon={Droplets}
              color="text-teal-500"
            />
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 transition-transform hover:scale-105">
            <CircularProgress
              value={sensorData.light}
              label="Light Intensity"
              icon={Sun}
              color="text-yellow-500"
            />
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 transition-transform hover:scale-105">
            <button
              onClick={captureImage}
              className="flex items-center justify-center w-full h-24 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Capture Image'}
              <Camera className="w-8 h-8 ml-2" />
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">System Status</h2>
          {error ? (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-red-600">{error}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">All sensors operating normally</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
