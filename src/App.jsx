import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Zap, Sun, Wind, Droplets, Battery, AlertCircle } from 'lucide-react';

const QuantumEnergyScheduler = () => {
  const [selectedRegion, setSelectedRegion] = useState('california');
  const [energyData, setEnergyData] = useState(null);
  const [quantumResults, setQuantumResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [usingRealData, setUsingRealData] = useState(false);
  
  const API_URL = 'https://quantumscheduler.up.railway.app';
  const NREL_API_KEY = 'DEMO_KEY';

  const regions = [
    { id: 'california', name: 'California (CAISO)', utilityId: 'PacifiCorp', shortName: 'California', lat: 36.7783, lon: -119.4179 },
    { id: 'texas', name: 'Texas (ERCOT)', utilityId: 'Oncor', shortName: 'Texas', lat: 31.9686, lon: -99.9018 },
    { id: 'newyork', name: 'New York (NYISO)', utilityId: 'ConEdison', shortName: 'New York', lat: 42.1657, lon: -74.9481 },
    { id: 'newengland', name: 'New England (ISO-NE)', utilityId: 'Eversource', shortName: 'New England', lat: 44.5588, lon: -69.6544 },
    { id: 'midwest', name: 'Midwest (MISO)', utilityId: 'ComEd', shortName: 'Midwest', lat: 41.8781, lon: -87.6298 },
    { id: 'pjm', name: 'PJM Interconnection', utilityId: 'PECO', shortName: 'PJM', lat: 40.0583, lon: -76.3055 },
    { id: 'southwest', name: 'Southwest (SPP)', utilityId: 'AEP', shortName: 'Southwest', lat: 35.2220, lon: -101.8313 },
    { id: 'northwest', name: 'Northwest (BPA)', utilityId: 'Seattle City Light', shortName: 'Northwest', lat: 47.7511, lon: -120.7401 }
  ];

  const fetchNRELSolarData = async (lat, lon) => {
    try {
      console.log('🌞 Fetching real solar data from NREL API...');
      
      const response = await fetch(
        `https://developer.nrel.gov/api/solar/solar_resource/v1.json?api_key=${NREL_API_KEY}&lat=${lat}&lon=${lon}`
      );
      
      if (!response.ok) {
        throw new Error('NREL API request failed');
      }
      
      const data = await response.json();
      console.log('✅ Real solar data received from NREL:', data);
      
      return data.outputs;
    } catch (error) {
      console.error('❌ NREL API error:', error);
      return null;
    }
  };

  const generateEnergyData = async (region) => {
    const regionInfo = regions.find(r => r.id === region);
    
    const regionConfig = {
      california: { baseLoad: 35000, solarPeak: 0.4, windFactor: 0.2, hydroFactor: 0.15 },
      texas: { baseLoad: 45000, solarPeak: 0.35, windFactor: 0.35, hydroFactor: 0.05 },
      newyork: { baseLoad: 28000, solarPeak: 0.25, windFactor: 0.2, hydroFactor: 0.1 },
      newengland: { baseLoad: 22000, solarPeak: 0.2, windFactor: 0.25, hydroFactor: 0.12 },
      midwest: { baseLoad: 38000, solarPeak: 0.28, windFactor: 0.4, hydroFactor: 0.08 },
      pjm: { baseLoad: 42000, solarPeak: 0.3, windFactor: 0.22, hydroFactor: 0.1 },
      southwest: { baseLoad: 32000, solarPeak: 0.38, windFactor: 0.32, hydroFactor: 0.06 },
      northwest: { baseLoad: 26000, solarPeak: 0.22, windFactor: 0.18, hydroFactor: 0.25 }
    };
    
    const config = regionConfig[region] || regionConfig.california;
    const baseLoad = config.baseLoad;
    let solarPeak = config.solarPeak;
    const windFactor = config.windFactor;
    const hydroFactor = config.hydroFactor;
    
    let nrelData = null;
    let isRealSolarData = false;
    
    if (regionInfo) {
      nrelData = await fetchNRELSolarData(regionInfo.lat, regionInfo.lon);
      if (nrelData && nrelData.avg_ghi) {
        const ghi = nrelData.avg_ghi.annual || 5;
        solarPeak = (ghi / 5) * config.solarPeak;
        isRealSolarData = true;
        setUsingRealData(true);
        console.log(`✅ Using real NREL solar data for ${regionInfo.name}: GHI=${ghi.toFixed(2)} kWh/m²/day`);
      }
    }
    
    const hourlyData = [];
    const currentHour = new Date().getHours();
    
    for (let i = 0; i < 24; i++) {
      const hour = (currentHour + i) % 24;
      const solarOutput = hour >= 6 && hour <= 18 
        ? Math.sin((hour - 6) * Math.PI / 12) * solarPeak * baseLoad
        : 0;
      const windOutput = (Math.sin(hour * Math.PI / 8) + 1) * windFactor * baseLoad / 2;
      const hydroOutput = baseLoad * hydroFactor;
      const demand = baseLoad * (0.7 + 0.3 * Math.sin((hour - 14) * Math.PI / 12));
      
      hourlyData.push({
        hour: `${hour}:00`,
        solar: Math.round(solarOutput),
        wind: Math.round(windOutput),
        hydro: Math.round(hydroOutput),
        demand: Math.round(demand),
        total: Math.round(solarOutput + windOutput + hydroOutput)
      });
    }
    
    return {
      region: regionInfo.name,
      timestamp: new Date().toISOString(),
      current: {
        solar: hourlyData[0].solar,
        wind: hourlyData[0].wind,
        hydro: hourlyData[0].hydro,
        total: hourlyData[0].total,
        demand: hourlyData[0].demand
      },
      hourly: hourlyData,
      capacity: {
        solar: Math.round(baseLoad * solarPeak),
        wind: Math.round(baseLoad * windFactor),
        hydro: Math.round(baseLoad * hydroFactor),
        battery: Math.round(baseLoad * 0.1)
      },
      dataSource: isRealSolarData ? 'NREL API (Real Solar Data)' : 'Simulated',
      nrelData: nrelData
    };
  };

  const runQuantumOptimization = async (energyData) => {
    setIsProcessing(true);
    
    try {
      console.log('🔄 Calling Qiskit backend at:', API_URL);
      
      const response = await fetch(`${API_URL}/api/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(energyData)
      });
      
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }
      
      const results = await response.json();
      console.log('✅ Real quantum results received from backend:', results);
      
      setQuantumResults({
        ...results,
        usingRealBackend: true
      });
      setBackendStatus('connected');
      
    } catch (error) {
      console.error('❌ Error calling quantum backend:', error);
      console.log('⚠️ Falling back to simulated results');
      
      setBackendStatus('fallback');
      
      const schedule = [];
      const recommendations = [];
      
      energyData.hourly.forEach((hour, idx) => {
        const surplus = hour.total - hour.demand;
        const batteryAction = surplus > 0 ? 'Charge' : 'Discharge';
        const batteryAmount = Math.min(Math.abs(surplus), energyData.capacity.battery);
        
        schedule.push({
          hour: hour.hour,
          action: batteryAction,
          amount: Math.round(batteryAmount),
          efficiency: Math.round(85 + Math.random() * 10),
          gridBalance: Math.round(surplus)
        });

        if (idx < 8) {
          if (surplus > energyData.capacity.battery * 0.5) {
            recommendations.push({
              time: hour.hour,
              type: 'excess',
              message: `High renewable output detected. Recommend charging storage or exporting ${Math.round(surplus * 0.8)} MW to grid.`
            });
          } else if (surplus < -energyData.capacity.battery * 0.3) {
            recommendations.push({
              time: hour.hour,
              type: 'deficit',
              message: `Demand exceeds supply. Recommend discharging storage or importing ${Math.round(Math.abs(surplus) * 0.9)} MW from grid.`
            });
          }
        }
      });

      setQuantumResults({
        schedule,
        recommendations,
        metrics: {
          qubits: 12,
          gates: 248,
          depth: 42,
          executionTime: '(Simulated)',
          fidelity: (0.92 + Math.random() * 0.06).toFixed(3),
          optimization: 'QAOA (Fallback Mode)',
          iterations: 50
        },
        summary: {
          totalOptimization: Math.round(15 + Math.random() * 10),
          costSaving: Math.round(12000 + Math.random() * 5000),
          carbonReduction: Math.round(450 + Math.random() * 200),
          efficiency: Math.round(88 + Math.random() * 8)
        },
        usingRealBackend: false
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const data = await generateEnergyData(selectedRegion);
      setEnergyData(data);
      runQuantumOptimization(data);
    };
    loadData();
  }, [selectedRegion]);

  if (!energyData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading energy data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Quantum Energy Scheduler</h1>
          </div>
          <div className="flex items-center gap-2">
            {backendStatus === 'checking' && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                Connecting to Quantum Backend...
              </div>
            )}
            {backendStatus === 'connected' && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">Real Qiskit Backend</span>
                {usingRealData && <span className="text-xs">+ NREL Data</span>}
              </div>
            )}
            {backendStatus === 'fallback' && (
              <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="font-semibold">Simulation Mode (Backend Offline)</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {regions.map(region => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedRegion === region.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {region.shortName}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-700 border-b-2 border-blue-600 pb-2">
            Observed Data
          </h2>

          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Current Production & Demand
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                {energyData.dataSource}
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-gray-600">Solar</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{energyData.current.solar.toLocaleString()}</p>
                <p className="text-xs text-gray-500">MW</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Wind className="w-5 h-5 text-cyan-500" />
                  <span className="text-sm text-gray-600">Wind</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{energyData.current.wind.toLocaleString()}</p>
                <p className="text-xs text-gray-500">MW</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-600">Hydro</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{energyData.current.hydro.toLocaleString()}</p>
                <p className="text-xs text-gray-500">MW</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-600">Demand</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{energyData.current.demand.toLocaleString()}</p>
                <p className="text-xs text-gray-500">MW</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Total Renewable Output</span>
                <span className="text-xl font-bold text-green-600">{energyData.current.total.toLocaleString()} MW</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-semibold text-gray-700">Net Balance</span>
                <span className={`text-xl font-bold ${energyData.current.total - energyData.current.demand > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(energyData.current.total - energyData.current.demand > 0 ? '+' : '')}{(energyData.current.total - energyData.current.demand).toLocaleString()} MW
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-4">24-Hour Production Forecast</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={energyData.hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" tick={{fontSize: 11}} stroke="#6b7280" />
                <YAxis tick={{fontSize: 11}} stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="solar" stroke="#eab308" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="wind" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="hydro" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="demand" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Battery className="w-5 h-5 text-green-600" />
              Regional Capacity
            </h3>
            <div className="space-y-3">
              {Object.entries(energyData.capacity).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{key}</span>
                  <span className="font-semibold text-gray-800">{value.toLocaleString()} MW</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-700 border-b-2 border-purple-600 pb-2">
            Quantum Optimization Results
          </h2>

          {isProcessing ? (
            <div className="bg-gray-50 rounded-lg p-12 border border-gray-200 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium">Processing quantum optimization...</p>
            </div>
          ) : quantumResults ? (
            <>
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-5 border border-purple-200">
                <h3 className="font-semibold text-gray-700 mb-2 flex items-center justify-between">
                  <span>Quantum Computing Metrics</span>
                  {quantumResults.usingRealBackend ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                      ✓ REAL QISKIT
                    </span>
                  ) : (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-semibold">
                      ⚠ SIMULATED
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm mt-4">
                  <div>
                    <span className="text-gray-600">Algorithm:</span>
                    <p className="font-semibold text-gray-800">{quantumResults.metrics.optimization}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Qubits Used:</span>
                    <p className="font-semibold text-gray-800">{quantumResults.metrics.qubits}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Circuit Depth:</span>
                    <p className="font-semibold text-gray-800">{quantumResults.metrics.depth}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Gate Count:</span>
                    <p className="font-semibold text-gray-800">{quantumResults.metrics.gates}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Execution Time:</span>
                    <p className="font-semibold text-gray-800">{quantumResults.metrics.executionTime}s</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Fidelity:</span>
                    <p className="font-semibold text-gray-800">{quantumResults.metrics.fidelity}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-4">Optimization Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Efficiency Gain</p>
                    <p className="text-2xl font-bold text-green-600">{quantumResults.summary.totalOptimization}%</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Cost Savings</p>
                    <p className="text-2xl font-bold text-blue-600">${quantumResults.summary.costSaving.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">CO₂ Reduction</p>
                    <p className="text-2xl font-bold text-green-600">{quantumResults.summary.carbonReduction}t</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">System Efficiency</p>
                    <p className="text-2xl font-bold text-purple-600">{quantumResults.summary.efficiency}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-4">Optimal Battery Schedule (Next 8h)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={quantumResults.schedule.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{fontSize: 11}} stroke="#6b7280" />
                    <YAxis tick={{fontSize: 11}} stroke="#6b7280" />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {quantumResults.schedule.slice(0, 8).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-200">
                      <span className="font-medium text-gray-700">{item.hour}</span>
                      <span className={`px-2 py-1 rounded ${item.action === 'Charge' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {item.action} {item.amount} MW
                      </span>
                      <span className="text-gray-600">{item.efficiency}% eff</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-4">System Recommendations</h3>
                <div className="space-y-3">
                  {quantumResults.recommendations.map((rec, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                      rec.type === 'excess' ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'
                    }`}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className={`w-5 h-5 mt-0.5 ${rec.type === 'excess' ? 'text-green-600' : 'text-orange-600'}`} />
                        <div>
                          <p className="font-medium text-sm text-gray-800">{rec.time}</p>
                          <p className="text-sm text-gray-700 mt-1">{rec.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default QuantumEnergyScheduler;