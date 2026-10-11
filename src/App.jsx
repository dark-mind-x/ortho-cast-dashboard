import React, { useEffect, useState, useMemo } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "./firebase";
import { 
  Activity, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2, 
  Radio, 
  Clock, 
  ChevronRight,
  BarChart3,
  Sliders,
  Save
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from "recharts";

const SENSOR_CONFIGS = {
  all: {
    id: "all",
    title: "All Parameters Combined",
    description: "Multi-channel view of pressure and thermal behavior",
    unit: "",
    domain: [0, 4095],
  },
  fsr1: {
    id: "fsr1",
    title: "Proximal Compartment (FSR 1)",
    description: "Force transducer monitoring upper cast interface pressure",
    unit: "ADC",
    color: "#2563eb",
    domain: [0, 4095],
  },
  fsr2: {
    id: "fsr2",
    title: "Distal Compartment (FSR 2)",
    description: "Force transducer monitoring lower limb compression",
    unit: "ADC",
    color: "#0891b2",
    domain: [0, 4095],
  },
  temperature: {
    id: "temperature",
    title: "Sub-Cast Skin Temperature",
    description: "Digital probe monitoring local inflammatory thermal response",
    unit: "°C",
    color: "#d97706",
    domain: [20, 45],
  }
};

export default function App() {
  const [sensorData, setSensorData] = useState({
    fsr1: 0,
    fsr2: 0,
    temperature: 0,
    alert: false,
    status: "STANDBY"
  });

  const [thresholds, setThresholds] = useState({
    pressureLimit: 2200,
    tempLimit: 37.5
  });
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);

  const [history, setHistory] = useState([]);
  const [lastPacketTime, setLastPacketTime] = useState(Date.now());
  const [isDeviceOnline, setIsDeviceOnline] = useState(false);
  const [activeMetric, setActiveMetric] = useState("all");

  useEffect(() => {
    const liveRef = ref(db, "patients/patient_01/live");
    const unsubscribe = onValue(liveRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensorData(data);
        setLastPacketTime(Date.now());
        setIsDeviceOnline(true);

        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setHistory((prev) => [
          ...prev.slice(-29),
          {
            time: timeLabel,
            fsr1: Number(data.fsr1) || 0,
            fsr2: Number(data.fsr2) || 0,
            temperature: Number(Number(data.temperature || 0).toFixed(1))
          }
        ]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const threshRef = ref(db, "patients/patient_01/thresholds");
    const unsubscribe = onValue(threshRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setThresholds({
          pressureLimit: val.pressureLimit ?? 2200,
          tempLimit: val.tempLimit ?? 37.5
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastPacketTime > 3500) {
        setIsDeviceOnline(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastPacketTime]);

  const handleUpdateThresholds = async () => {
    setIsSavingThresholds(true);
    try {
      await set(ref(db, "patients/patient_01/thresholds"), {
        pressureLimit: Number(thresholds.pressureLimit),
        tempLimit: Number(thresholds.tempLimit)
      });
      setTimeout(() => setIsSavingThresholds(false), 600);
    } catch (err) {
      console.error("Failed to update thresholds:", err);
      setIsSavingThresholds(false);
    }
  };

  const activeConfig = SENSOR_CONFIGS[activeMetric];

  const stats = useMemo(() => {
    if (history.length === 0) return { min: 0, max: 0, avg: 0 };
    const key = activeMetric === "all" ? "fsr1" : activeMetric;
    const values = history.map((h) => h[key]);
    const sum = values.reduce((acc, v) => acc + v, 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: (sum / values.length).toFixed(1)
    };
  }, [history, activeMetric]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 font-sans selection:bg-zinc-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Clinical Navigation Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Department of Orthopedics</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight mt-1">
              Smart Cast Telemetry Console
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">Subject: PATIENT-001 • Cast Model: POP/Fiberglass Splint</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono font-medium ${
              isDeviceOnline 
                ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}>
              <Radio size={14} className={isDeviceOnline ? "animate-pulse text-emerald-400" : "text-zinc-600"} />
              <span>HARDWARE: {isDeviceOnline ? "ONLINE" : "DISCONNECTED / OFF"}</span>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium ${
              !isDeviceOnline 
                ? "bg-zinc-900 border-zinc-800 text-zinc-500"
                : sensorData.alert 
                  ? "bg-rose-950/60 border-rose-700 text-rose-300 font-semibold"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300"
            }`}>
              {sensorData.alert && isDeviceOnline ? (
                <>
                  <AlertTriangle size={14} className="text-rose-400" />
                  <span>ALERT: THRESHOLD EXCEEDED</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>PARAMETERS WITHIN LIMITS</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Offline Warning Banner */}
        {!isDeviceOnline && (
          <div className="p-4 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-zinc-400 text-xs">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-zinc-500" />
              <span>No telemetry packets received from ESP32 in the last 3.5 seconds. Check device power and Wi-Fi connection.</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">Standby</span>
          </div>
        )}

        {/* Clinician Threshold Calibration Panel */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Clinician Threshold Calibration</h2>
            </div>
            <button
              onClick={handleUpdateThresholds}
              disabled={isSavingThresholds}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs rounded transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save size={13} />
              <span>{isSavingThresholds ? "Updating ESP32..." : "Push Limits to Cast"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                <span>Maximum Pressure / Swelling Cut-off</span>
                <span className="font-mono text-zinc-200">{thresholds.pressureLimit} ADC</span>
              </div>
              <input 
                type="range"
                min="500"
                max="3800"
                step="50"
                value={thresholds.pressureLimit}
                onChange={(e) => setThresholds((prev) => ({ ...prev, pressureLimit: Number(e.target.value) }))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                <span>Maximum Sub-Cast Temperature Limit</span>
                <span className="font-mono text-zinc-200">{thresholds.tempLimit} °C</span>
              </div>
              <input 
                type="range"
                min="32.0"
                max="41.0"
                step="0.1"
                value={thresholds.tempLimit}
                onChange={(e) => setThresholds((prev) => ({ ...prev, tempLimit: Number(e.target.value) }))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Clickable Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => setActiveMetric("fsr1")}
            className={`cursor-pointer transition-all rounded-lg p-5 border text-left ${
              activeMetric === "fsr1"
                ? "bg-zinc-900 border-blue-500/80 ring-1 ring-blue-500/30"
                : "bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Proximal Swelling</span>
              <span className="text-[11px] font-mono text-zinc-500">PIN 34</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold font-mono tracking-tight text-zinc-100">
                {isDeviceOnline ? sensorData.fsr1 : "—"}
              </span>
              <span className="text-xs text-zinc-500 font-mono">ADC</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 pt-3 border-t border-zinc-800/60">
              <span>Threshold: {thresholds.pressureLimit}</span>
              <span className="flex items-center text-blue-400 font-medium">Inspect Graph <ChevronRight size={12} /></span>
            </div>
          </div>

          <div 
            onClick={() => setActiveMetric("fsr2")}
            className={`cursor-pointer transition-all rounded-lg p-5 border text-left ${
              activeMetric === "fsr2"
                ? "bg-zinc-900 border-cyan-500/80 ring-1 ring-cyan-500/30"
                : "bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Distal Swelling</span>
              <span className="text-[11px] font-mono text-zinc-500">PIN 35</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold font-mono tracking-tight text-zinc-100">
                {isDeviceOnline ? sensorData.fsr2 : "—"}
              </span>
              <span className="text-xs text-zinc-500 font-mono">ADC</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 pt-3 border-t border-zinc-800/60">
              <span>Threshold: {thresholds.pressureLimit}</span>
              <span className="flex items-center text-cyan-400 font-medium">Inspect Graph <ChevronRight size={12} /></span>
            </div>
          </div>

          <div 
            onClick={() => setActiveMetric("temperature")}
            className={`cursor-pointer transition-all rounded-lg p-5 border text-left ${
              activeMetric === "temperature"
                ? "bg-zinc-900 border-amber-500/80 ring-1 ring-amber-500/30"
                : "bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Skin Temperature</span>
              <span className="text-[11px] font-mono text-zinc-500">DS18B20</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold font-mono tracking-tight text-zinc-100">
                {isDeviceOnline ? Number(sensorData.temperature).toFixed(1) : "—"}
              </span>
              <span className="text-xs text-zinc-500 font-mono">°C</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 pt-3 border-t border-zinc-800/60">
              <span>Threshold: {thresholds.tempLimit}°C</span>
              <span className="flex items-center text-amber-400 font-medium">Inspect Graph <ChevronRight size={12} /></span>
            </div>
          </div>
        </div>

        {/* Dynamic Graph Container */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-zinc-400" />
                <h2 className="text-base font-medium text-zinc-100">{activeConfig.title}</h2>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{activeConfig.description}</p>
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800 self-start sm:self-auto">
              <button
                onClick={() => setActiveMetric("all")}
                className={`px-3 py-1 text-xs rounded font-medium transition-all ${
                  activeMetric === "all" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Combined
              </button>
              <button
                onClick={() => setActiveMetric("fsr1")}
                className={`px-3 py-1 text-xs rounded font-medium transition-all ${
                  activeMetric === "fsr1" ? "bg-zinc-800 text-blue-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                FSR 1
              </button>
              <button
                onClick={() => setActiveMetric("fsr2")}
                className={`px-3 py-1 text-xs rounded font-medium transition-all ${
                  activeMetric === "fsr2" ? "bg-zinc-800 text-cyan-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                FSR 2
              </button>
              <button
                onClick={() => setActiveMetric("temperature")}
                className={`px-3 py-1 text-xs rounded font-medium transition-all ${
                  activeMetric === "temperature" ? "bg-zinc-800 text-amber-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Temperature
              </button>
            </div>
          </div>

          {activeMetric !== "all" && (
            <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-zinc-950/60 rounded border border-zinc-800/60 font-mono text-xs text-zinc-400">
              <div><span className="text-zinc-600">MIN:</span> {stats.min} {activeConfig.unit}</div>
              <div><span className="text-zinc-600">AVG:</span> {stats.avg} {activeConfig.unit}</div>
              <div><span className="text-zinc-600">PEAK:</span> {stats.max} {activeConfig.unit}</div>
            </div>
          )}

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {activeMetric === "all" ? (
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorFSR1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFSR2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="time" stroke="#71717a" tick={{ fontSize: 10, fill: "#71717a" }} />
                  <YAxis stroke="#71717a" domain={[0, 4095]} tick={{ fontSize: 10, fill: "#71717a" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "6px" }}
                    labelStyle={{ color: "#a1a1aa", fontSize: 11 }}
                    itemStyle={{ fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="fsr1" stroke="#2563eb" strokeWidth={1.5} fillOpacity={1} fill="url(#colorFSR1)" name="Proximal (FSR 1)" />
                  <Area type="monotone" dataKey="fsr2" stroke="#0891b2" strokeWidth={1.5} fillOpacity={1} fill="url(#colorFSR2)" name="Distal (FSR 2)" />
                </AreaChart>
              ) : (
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="singleMetricGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeConfig.color} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={activeConfig.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="time" stroke="#71717a" tick={{ fontSize: 10, fill: "#71717a" }} />
                  <YAxis stroke="#71717a" domain={activeConfig.domain} tick={{ fontSize: 10, fill: "#71717a" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "6px" }}
                    labelStyle={{ color: "#a1a1aa", fontSize: 11 }}
                    itemStyle={{ fontSize: 12 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={activeMetric} 
                    stroke={activeConfig.color} 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#singleMetricGrad)" 
                    name={activeConfig.title} 
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
