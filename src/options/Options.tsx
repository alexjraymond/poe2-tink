import { useEffect, useState } from "react";

interface Settings {
  enabled: boolean;
  username: string;
}

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  username: "",
};

export function Options() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(DEFAULT_SETTINGS).then((result) => {
      setSettings(result as Settings);
    });
  }, []);

  const save = () => {
    void chrome.storage.sync.set(settings).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };

  return (
    <main className="options">
      <h1>POE2 Tink — Options</h1>

      <label className="field">
        <span>Username</span>
        <input
          type="text"
          value={settings.username}
          onChange={(e) =>
            setSettings((s) => ({ ...s, username: e.target.value }))
          }
          placeholder="Enter a username"
        />
      </label>

      <label className="field checkbox">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) =>
            setSettings((s) => ({ ...s, enabled: e.target.checked }))
          }
        />
        <span>Enable extension</span>
      </label>

      <button onClick={save}>Save</button>
      {saved && <p className="status">Settings saved.</p>}
    </main>
  );
}
