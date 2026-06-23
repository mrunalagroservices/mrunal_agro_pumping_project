# Mrunal Agro — Pumping Control System

Standalone IoT system for controlling farm motors/pumps via ESP32 gateway devices,
with a web dashboard and mobile app. Designed to be merged into the main
**Mrunal Agro** platform later — it follows the same MQTT topic conventions and a
schema shaped like the existing `devices` / `actuators` / `automation_rules` tables.

## Structure

```
backend/    Node.js + Express + Socket.io + MQTT + PostgreSQL API
dashboard/  Next.js web dashboard
mobile/     Flutter mobile app
firmware/   ESP32 gateway firmware (PlatformIO / Arduino)
shared/     Shared types/constants (MQTT topics, payload shapes)
```

## MQTT Conventions (compatible with main platform)

Broker: separate HiveMQ Cloud instance for now (swap URL in `.env` to merge later).

| Topic | Direction | Payload |
|---|---|---|
| `farm/{org_id}/{api_key}/sensors` | device → backend | `{ <channel>: <value>, ... }` |
| `farm/{org_id}/{api_key}/status` | device → backend | `{ status: "online", firmware_version, ip, relay_states }` (LWT = offline) |
| `farm/{org_id}/{api_key}/command` | backend → device | `{ action, actuator_id, relay_channel, state, duration }` |

`org_id` + `api_key` are validated against the `devices` table before any DB write.

## Getting started (backend)

```bash
cd backend
cp .env.example .env   # fill in DB / MQTT credentials
npm install
npm run dev
```

## Getting started (dashboard)

```bash
cd dashboard
cp .env.example .env.local   # points at the backend API/socket URLs
npm install
npm run dev
```

The dashboard is a Next.js app (App Router) with Tailwind CSS, lucide-react
icons, and socket.io-client for real-time sensor/actuator/alert updates. It
talks to the backend at `NEXT_PUBLIC_API_URL` (default
`http://localhost:3010/api/v1`) and joins the org's Socket.io room using the
JWT stored after login/registration.

Pages: dashboard overview, farms, devices (with sensors + actuator on/off
controls), automation rules, schedules, and alerts.








TODO list:
1. Recommended products should not be hard coded - create recommendation system
2. AI crop health checking by clicking just photo - app
3. Admin Fully managable dashboard
4. Docs for deploying apps
5. Payment systems