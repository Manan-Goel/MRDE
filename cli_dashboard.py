"""
MRDE CLI Dashboard — Terminal UI

Satellite selector + risk dashboard with AI explanation cards and 24h forecast.
Uses engine.py as the core.
"""

import os
import sys
import time

try:
    import msvcrt
except ImportError:
    msvcrt = None

from engine import (
    SAT_KEYS, SATELLITES, ACCEL, TICK_S,
    default_state, tick, get_sat_summaries, get_dashboard,
    alert_summary, fmt_time, fmt_level,
)

W = 106

selected = "sat1"
paused = False

def clear():
    os.system("cls" if os.name == "nt" else "clear")

def bar(value, width=40):
    filled = int(value / 100 * width)
    return "#" * filled + "." * (width - filled)

def sparkline(vals, width=50):
    if len(vals) < 2:
        return "(...)"
    mn = max(0, min(vals) - 3)
    mx = min(100, max(vals) + 3)
    if mx == mn:
        mx = mn + 1
    line = ""
    for v in vals:
        pos = int((v - mn) / (mx - mn) * 4)
        line += " _-o"[min(pos, 4)]
    return line, mn, mx

def draw_selector(summaries):
    parts = []
    for s in summaries:
        active = ">" if s["key"] == selected else " "
        marker = "<" if s["key"] == selected else " "
        mov = ""
        if s.get("movement") == "up":
            mov = "^"
        elif s.get("movement") == "down":
            mov = "v"
        parts.append(f" {active}[{s['key'][-1]}] {s['name']:<22}{mov} {marker}")
    line = "   ".join(parts)
    badges = []
    for s in summaries:
        hl = "  > " if s["key"] == selected else "    "
        badges.append(f"{hl}UMRS: {s['umrs']:<6.1f} {fmt_level(s['level']):<6}")
    badge_line = "   ".join(badges)
    labels = []
    for s in summaries:
        hl = "  > " if s["key"] == selected else "    "
        labels.append(f"{hl}{s['label']:<28}")
    label_line = "   ".join(labels)
    return f"{line}\n{badge_line}\n{label_line}"

def draw_bars(dash):
    sc = dash["scores"]
    comps = [
        ("Collision Risk",      sc["collision"]),
        ("Space Weather",       sc["weather"]),
        ("Ground Segment",      sc["ground"]),
        ("Spacecraft Health",   sc["health"]),
    ]
    lines = []
    for name, val in comps:
        lbl = ""
        if val >= 85:
            lbl = "CRIT"
        elif val >= 50:
            lbl = "HIGH"
        elif val >= 25:
            lbl = "MOD"
        else:
            lbl = "LOW"
        lines.append(f"  {name:<20} {bar(val):40s} {val:>6.1f}  {lbl:4s}")
    return "\n".join(lines)

def draw_recs(dash):
    lines = []
    for rec in dash["recommendations"]:
        p = rec["priority"]
        comp = rec["component"]
        ts = rec["time_sensitivity"]
        conf = rec["confidence"]
        hl = rec["headline"]
        expl = rec["explanation"]
        action = rec["recommended_action"]
        lines.append(f"  #{p}  {comp:<22}  [{ts:<10}] [{conf}]")
        if hl:
            lines.append(f"       {hl}")
        if expl:
            lines.append(f"       {expl}")
        if action:
            lines.append(f"       >> {action}")
        lines.append("")
    return "\n".join(lines) if lines else "  No recommendations."

def draw_forecast(sat_key, dash):
    fc = dash["forecast"]
    profile = SATELLITES[sat_key]

    umrs_vals = [p["umrs"] for p in fc]
    coll_vals = [p["collision"] for p in fc]
    health_vals = [p["health"] for p in fc]
    ground_vals = [p["ground"] for p in fc]
    weather_vals = [p["weather"] for p in fc]

    w = 24
    tick_w = max(1, w // 12)

    lines = [f"  24-HOUR FORECAST - {profile['name']}"]

    lines.append(f"  Hour:    " + "".join(f"{p['hour']:>3}" if p["hour"] % tick_w == 0 else "   " for p in fc))
    lines.append(f"  UMRS:    " + "".join(f"{p['umrs']:>3.0f}" for p in fc))
    lines.append(f"  Coll:    " + "".join(f"{p['collision']:>3.0f}" for p in fc))
    lines.append(f"  Health:  " + "".join(f"{p['health']:>3.0f}" for p in fc))
    lines.append(f"  Ground:  " + "".join(f"{p['ground']:>3.0f}" for p in fc))
    lines.append(f"  Wthr:    " + "".join(f"{p['weather']:>3.0f}" for p in fc))

    events_line = "  Events:  "
    for p in fc:
        if p["events"]:
            events_line += " ^ "
        else:
            events_line += "   "
    lines.append(events_line)

    evt_rows = set()
    for p in fc:
        for e in p["events"]:
            evt_rows.add(f"    h{p['hour']:02d}: {e}")
    if evt_rows:
        lines.append("  Scheduled:")
        for r in sorted(evt_rows):
            lines.append(r)

    spark, mn, mx = sparkline(umrs_vals)
    lines.append(f"  Trend:   {spark}  (range {mn:.0f}-{mx:.0f})")

    return "\n".join(lines)

def render(state, dash):
    clear()
    buf = []
    buf.append("=" * W)
    buf.append(f"  MRDE SATELLITE RISK DASHBOARD    +{fmt_time(state['clock_min'])}    Kp={state['kp_val']}  Alerts: {alert_summary(state)}  {'[PAUSED]' if paused else ''}")
    buf.append("=" * W)

    summaries = dash.get("all_summaries", get_sat_summaries(state))
    buf.append(draw_selector(summaries))
    buf.append("-" * W)

    profile = SATELLITES[selected]
    sc = dash["scores"]
    mov = ""
    if dash.get("movement") == "up":
        mov = "  ^ UP"
    elif dash.get("movement") == "down":
        mov = "  v DOWN"
    buf.append(f"  >> {profile['name']} - {sc['level']} (UMRS: {sc['umrs']}) - Dominant: {profile['label']}{mov}")
    buf.append(f"     {profile['desc']}")
    buf.append("-" * W)

    buf.append("  RISK BREAKDOWN:")
    buf.append(draw_bars(dash))
    buf.append("-" * W)

    buf.append("  PRIORITY & RECOMMENDATIONS:")
    buf.append(draw_recs(dash))
    buf.append("-" * W)

    recent = dash.get("recent_events", [])
    if recent:
        buf.append("  LIVE EVENTS (selected satellite):")
        for evt in recent[-4:]:
            buf.append(f"    {evt}")
        buf.append("-" * W)

    buf.append(draw_forecast(selected, dash))
    buf.append("=" * W)

    tip = "  1/2/3=Select  p=Pause  q=Quit"
    if paused:
        tip += "  [PAUSED]"
    buf.append(f"  {tip}")
    buf.append("=" * W)

    sys.stdout.write("\n".join(buf) + "\n")
    sys.stdout.flush()

def main():
    global selected, paused
    state = default_state()

    summaries = get_sat_summaries(state)
    dash = get_dashboard(selected, state)
    render(state, dash)

    try:
        tick_count = 0
        while True:
            if not paused:
                state = tick(state)
                dash = get_dashboard(selected, state)
                render(state, dash)
                tick_count += 1

            if msvcrt is not None:
                for _ in range(5):
                    if msvcrt.kbhit():
                        ch = msvcrt.getch().decode("utf-8", errors="replace").lower()
                        if ch == "q":
                            print("\nDashboard closed.")
                            return
                        elif ch == "p":
                            paused = not paused
                        elif ch in ("1", "2", "3"):
                            selected = f"sat{ch}"
                            dash = get_dashboard(selected, state)
                            render(state, dash)
                        elif ch == "\x1b":
                            pass
                    time.sleep(TICK_S / 10.0)
            else:
                time.sleep(TICK_S)

    except KeyboardInterrupt:
        print("\nDashboard closed.")

if __name__ == "__main__":
    main()
