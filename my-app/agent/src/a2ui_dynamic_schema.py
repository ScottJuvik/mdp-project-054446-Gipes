from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from typing import Any

from langchain.tools import ToolRuntime, tool
from langchain_core.messages import SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.types import Command
from openai import RateLimitError


def _message_content(message: Any) -> str:
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            str(part.get("text", part)) if isinstance(part, dict) else str(part)
            for part in content
        )
    return str(content)


def _message_role(message: Any) -> str:
    role = getattr(message, "type", None) or getattr(message, "role", None) or ""
    return str(role).lower()


def _to_number(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "."))
        except ValueError:
            return 0.0
    return 0.0


def _energy_to_wh(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return 0.0

    text = value.strip().lower()
    amount = text.split()[0] if text.split() else text

    if "," in amount and "." not in amount:
        before, after = amount.split(",", 1)
        if len(after) == 3 and before.isdigit() and after.isdigit():
            parsed = float(f"{before}{after}")
        else:
            parsed = _to_number(amount)
    elif "." in amount and "," not in amount:
        before, after = amount.split(".", 1)
        if len(after) == 3 and before.isdigit() and after.isdigit():
            parsed = float(f"{before}{after}")
        else:
            parsed = _to_number(amount)
    else:
        parsed = _to_number(amount)

    if "kwh" in text:
        return parsed * 1000
    return parsed


def _chart_points(items: list[dict[str, Any]], color: str) -> list[dict[str, Any]]:
    return [
        {"label": item["day"], "value": _to_number(item["kwh"]), "color": color}
        for item in items
    ]


def _mock_energy_prices() -> list[dict[str, Any]]:
    start = datetime(2026, 5, 26)
    prices: list[dict[str, Any]] = []

    for day_index in range(7):
        day = start + timedelta(days=day_index)
        for hour in range(24):
            if hour < 6:
                base = 0.15
            elif hour < 10:
                base = 0.23
            elif hour < 16:
                base = 0.18
            elif hour < 21:
                base = 0.31
            else:
                base = 0.21

            weekend_discount = -0.03 if day.weekday() >= 5 else 0
            daily_variation = (day_index % 3) * 0.01
            hour_variation = (hour % 4) * 0.005
            prices.append(
                {
                    "timestamp": day.replace(hour=hour).isoformat(),
                    "day": day.strftime("%A"),
                    "hour": f"{hour:02d}:00",
                    "eurPerKwh": round(
                        base + weekend_discount + daily_variation + hour_variation,
                        3,
                    ),
                }
            )

    return prices


def _mock_appliance_hourly_usage() -> list[dict[str, Any]]:
    start = datetime(2026, 5, 26)
    appliances = ["Lavatrice", "Doccia", "Lavastoviglie", "Forno", "Frigorifero"]
    usage: list[dict[str, Any]] = []

    for day_index in range(7):
        day = start + timedelta(days=day_index)
        for hour in range(24):
            for appliance in appliances:
                wh = 0
                if appliance == "Frigorifero":
                    wh = 38 + ((hour + day_index) % 5) * 3
                elif appliance == "Doccia" and hour in (6, 7, 20):
                    wh = 120 + (day_index % 3) * 20
                elif appliance == "Lavatrice" and day_index in (0, 2, 4, 6) and hour in (10, 11):
                    wh = 210 if hour == 10 else 90
                elif appliance == "Lavastoviglie" and day_index in (1, 3, 5) and hour in (21, 22):
                    wh = 360 if hour == 21 else 140
                elif appliance == "Forno" and day_index in (2, 6) and hour == 19:
                    wh = 850

                usage.append(
                    {
                        "timestamp": day.replace(hour=hour).isoformat(),
                        "day": day.strftime("%A"),
                        "hour": f"{hour:02d}:00",
                        "appliance": appliance,
                        "wh": wh,
                    }
                )

    return usage


def _requested_appliance(intent_text: str) -> str | None:
    intent = intent_text.lower()
    if any(word in intent for word in ["washing", "washer", "lavatrice"]):
        return "Lavatrice"
    if any(word in intent for word in ["shower", "doccia"]):
        return "Doccia"
    if any(word in intent for word in ["dishwasher", "lavastoviglie"]):
        return "Lavastoviglie"
    if any(word in intent for word in ["oven", "forno"]):
        return "Forno"
    if any(word in intent for word in ["fridge", "refrigerator", "frigorifero"]):
        return "Frigorifero"
    return None


def _is_active_appliances_request(intent_text: str) -> bool:
    intent = intent_text.lower()
    return any(word in intent for word in ["active", "attivi", "attive", "currently on"])


def _device_points(devices: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "label": item.get("name", "Dispositivo"),
            "value": _energy_to_wh(item.get("value", 0)),
            "color": "#3b82f6",
        }
        for item in devices
        if _energy_to_wh(item.get("value", 0)) > 0
    ]


def _daily_appliance_points(
    appliance_hourly_usage: list[dict[str, Any]],
    appliance: str,
) -> list[dict[str, Any]]:
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    totals = {day: 0 for day in day_order}

    for item in appliance_hourly_usage:
        if item.get("appliance") == appliance and item.get("day") in totals:
            totals[item["day"]] += int(item.get("wh", 0))

    return [
        {"label": day, "value": totals[day], "color": "#3b82f6"}
        for day in day_order
        if totals[day] > 0
    ]


def _daily_min_price_points(
    energy_prices: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    day_order = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    minimums: dict[str, dict[str, Any]] = {}

    for item in energy_prices:
        day = item.get("day")
        price = item.get("eurPerKwh")
        if day not in day_order or price is None:
            continue
        if day not in minimums or price < minimums[day]["eurPerKwh"]:
            minimums[day] = item

    return [
        {
            "label": f"{day[:3]} {minimums[day]['hour']}",
            "value": minimums[day]["eurPerKwh"],
            "color": "#f97316",
        }
        for day in day_order
        if day in minimums
    ]


def _requested_chart_type(intent_text: str) -> str | None:
    intent = intent_text.lower()

    if any(word in intent for word in ["stacked bar", "stackedbar", "stacked chart"]):
        return "stackedBar"
    if any(word in intent for word in ["bar chart", "bar graph", "histogram", "bars"]):
        return "bar"
    if any(word in intent for word in ["line chart", "line graph", "trend", "andamento"]):
        return "line"
    if any(word in intent for word in ["pie chart", "donut", "doughnut"]):
        return "pie"
    if any(word in intent for word in ["gauge", "meter", "dial"]):
        return "gauge"
    if any(word in intent for word in ["card", "value only", "solo valore"]):
        return "card"

    return None


def _is_affirmation(intent_text: str) -> bool:
    intent = intent_text.lower().strip()
    return intent in {
        "yes",
        "yes please",
        "show it",
        "show it visually",
        "generate it",
        "display it",
    }


def _conversation_context(messages: list[Any]) -> tuple[str, str]:
    user_messages = [message for message in messages if _message_role(message) in {"human", "user"}]
    latest_user = _message_content(user_messages[-1]) if user_messages else ""
    previous_user = _message_content(user_messages[-2]) if len(user_messages) > 1 else ""
    return latest_user, previous_user


def _reply_language_instruction(intent_text: str, previous_user_text: str = "") -> str:
    language_source = previous_user_text if _is_affirmation(intent_text) and previous_user_text else intent_text
    source = language_source.lower()

    italian_markers = [
        "quanto",
        "mostra",
        "visualizza",
        "prezzo",
        "prezzi",
        "settimana",
        "lavatrice",
        "consumo",
        "energia",
    ]
    if any(marker in source for marker in italian_markers):
        return "Reply in Italian."

    return "Reply in English."


def _requested_consumption_topic(intent_text: str) -> str:
    intent = intent_text.lower()

    if any(word in intent for word in ["produce", "production", "fotovoltaic", "fotovoltaico", "solar"]):
        return "production"
    if any(word in intent for word in ["price", "electricity", "prezz", "tariff"]):
        return "prices"
    if any(word in intent for word in ["appliance", "device", "lavatrice", "washing", "washer", "dispositivo", "usage"]):
        return "appliances"
    if any(word in intent for word in ["self-consumption", "self consumption", "autoconsumo", "self"]):
        return "self"

    return "consumption"


def _looks_like_layout_request(intent_text: str) -> bool:
    intent = intent_text.lower()
    return any(
        word in intent
        for word in ["swap", "hide", "show only", "reorder", "layout", "move section"]
    )


def _fallback_dashboard_overrides(
    intent_text: str,
    weekly_consumption: list[dict[str, Any]],
    weekly_production: list[dict[str, Any]],
    appliance_stats: list[dict[str, Any]],
    energy_prices: list[dict[str, Any]],
    appliance_hourly_usage: list[dict[str, Any]],
    current_state: dict[str, Any],
) -> dict[str, Any]:
    intent = intent_text.lower()
    requested_type = _requested_chart_type(intent_text)
    topic = _requested_consumption_topic(intent_text)

    if "reset" in intent or "riprist" in intent:
        return {}

    if requested_type == "gauge" or (topic == "self" and requested_type is None):
        return {
            "sections": ["metrics", "consumption", "devices"],
            "consumption": {
                "type": "gauge",
                "title": "Autoconsumo",
                "value": current_state.get("selfPercent", 78),
                "color": "#22c55e",
            },
        }

    if topic == "prices":
        price_data = _daily_min_price_points(energy_prices)
        return {
            "sections": ["metrics", "consumption", "devices"],
            "consumption": {
                "type": "line",
                "title": "Prezzi minimi giornalieri",
                "color": "#f97316",
                "data": price_data,
            },
        }

    if topic == "appliances":
        requested_appliance = _requested_appliance(intent_text)
        if _is_active_appliances_request(intent_text):
            return {
                "sections": ["metrics", "consumption", "devices"],
                "consumption": {
                    "type": "bar",
                    "title": "Dispositivi attivi",
                    "unit": "Wh",
                    "color": "#3b82f6",
                    "data": _device_points(current_state.get("devices", [])),
                },
            }

        if requested_appliance:
            daily_usage = _daily_appliance_points(
                appliance_hourly_usage,
                requested_appliance,
            )
            return {
                "sections": ["metrics", "consumption", "devices"],
                "consumption": {
                    "type": "bar",
                    "title": f"Consumo {requested_appliance}",
                    "unit": "Wh",
                    "color": "#3b82f6",
                    "data": daily_usage,
                },
            }

        return {
            "sections": ["metrics", "consumption", "devices"],
            "consumption": {
                "type": "bar",
                "title": "Consumo dispositivi",
                "unit": "Wh",
                "color": "#3b82f6",
                "data": [
                    {
                        "label": item["name"],
                        "value": _energy_to_wh(item["consumed"]),
                        "color": "#3b82f6",
                    }
                    for item in appliance_stats
                ],
            },
        }

    if topic == "production":
        return {
            "sections": ["metrics", "consumption", "devices"],
            "consumption": {
                "type": "line",
                "title": "Produzione settimanale",
                "color": "#22c55e",
                "data": _chart_points(weekly_production, "#22c55e"),
            },
        }

    if requested_type == "pie":
        return {
            "sections": ["metrics", "consumption", "devices"],
            "consumption": {
                "type": "pie",
                "title": "Consumo energetico",
                "data": [
                    {
                        "label": "Fotovoltaico",
                        "value": _to_number(current_state.get("fotovoltaico", 0)),
                        "color": "#22c55e",
                    },
                    {
                        "label": "Batteria",
                        "value": _to_number(current_state.get("batteria", 0)),
                        "color": "#3b82f6",
                    },
                    {
                        "label": "Rete",
                        "value": _to_number(current_state.get("rete", 0)),
                        "color": "#f97316",
                    },
                ],
            },
        }

    if requested_type == "stackedBar":
        return {
            "sections": ["metrics", "consumption", "devices"],
            "consumption": {
                "type": "stackedBar",
                "title": "Consumo settimanale",
                "color": "#22c55e",
                "data": _chart_points(weekly_consumption, "#22c55e"),
            },
        }

    if requested_type == "line":
        return {
            "sections": ["metrics", "consumption", "devices"],
            "consumption": {
                "type": "line",
                "title": "Consumo settimanale",
                "color": "#22c55e",
                "data": _chart_points(weekly_consumption, "#22c55e"),
            },
        }

    if requested_type == "bar":
        return {
            "sections": ["metrics", "consumption", "devices"],
            "consumption": {
                "type": "bar",
                "title": "Consumo settimanale",
                "color": "#22c55e",
                "data": _chart_points(weekly_consumption, "#22c55e"),
            },
        }

    return {
        "sections": ["metrics", "consumption", "devices"],
        "consumption": {
            "type": "bar",
            "title": "Consumo settimanale",
            "color": "#22c55e",
            "data": _chart_points(weekly_consumption, "#22c55e"),
        },
    }


def _fallback_command(
    runtime: ToolRuntime[Any],
    dashboard_overrides: dict[str, Any],
    reason: str,
    language_instruction: str,
) -> Command:
    return Command(
        update={
            "dashboardOverrides": dashboard_overrides,
            "messages": [
                ToolMessage(
                    content=(
                        f"Dashboard preview prepared with a fallback ({reason}). "
                        f"{language_instruction} "
                        "Final user-facing response must tell the user the "
                        "preview is ready and they can accept or decline it. "
                        "Do not ask whether they want to visualize it. Keep it "
                        "warm and concise. Do not mention JSON, code, tools, or "
                        "implementation details."
                    ),
                    tool_call_id=runtime.tool_call_id,
                )
            ],
        }
    )


@tool()
def generate_a2ui(runtime: ToolRuntime[Any]) -> Command:
    """
    Generate or update the Edison dashboard layout and charts.

    Use this only when the user clearly asks for a visual UI change, chart,
    graph, dashboard section, or layout change. Do not use this for plain
    factual questions.
    """

    messages = runtime.state["messages"][:-1]
    intent_text, previous_user_text = _conversation_context(runtime.state["messages"])
    if not intent_text:
        intent_text = "\n".join(_message_content(message) for message in runtime.state["messages"])

    prompt_context_text = intent_text
    analysis_text = intent_text
    visual_request = any(
        word in intent_text.lower()
        for word in ["chart", "graph", "visual", "visualize", "generate", "show"]
    )

    if _is_affirmation(intent_text) and previous_user_text:
        prompt_context_text = f"{previous_user_text}\n{intent_text}"
        analysis_text = prompt_context_text
    elif visual_request and not _requested_chart_type(intent_text) and _requested_consumption_topic(intent_text) == "consumption" and previous_user_text:
        analysis_text = previous_user_text

    weekly_consumption = runtime.state.get("weeklyConsumption") or [
        {"day": "Monday", "kwh": "2,10"},
        {"day": "Tuesday", "kwh": "2,40"},
        {"day": "Wednesday", "kwh": "2,25"},
        {"day": "Thursday", "kwh": "2,70"},
        {"day": "Friday", "kwh": "2,35"},
        {"day": "Saturday", "kwh": "3,05"},
        {"day": "Sunday", "kwh": "2,80"},
    ]
    weekly_production = runtime.state.get("weeklyProduction") or [
        {"day": "Monday", "kwh": "4,20"},
        {"day": "Tuesday", "kwh": "4,55"},
        {"day": "Wednesday", "kwh": "3,90"},
        {"day": "Thursday", "kwh": "5,10"},
        {"day": "Friday", "kwh": "4,75"},
        {"day": "Saturday", "kwh": "4,30"},
        {"day": "Sunday", "kwh": "4,20"},
    ]
    appliance_stats = runtime.state.get("applianceStats") or [
        {"name": "Lavatrice", "active": True, "consumed": "1.2 kWh", "weeklyUses": 4},
        {"name": "Doccia", "active": True, "consumed": "250 Wh", "weeklyUses": 7},
    ]
    energy_prices = runtime.state.get("energyPrices") or _mock_energy_prices()
    appliance_hourly_usage = (
        runtime.state.get("applianceHourlyUsage") or _mock_appliance_hourly_usage()
    )
    include_prices = any(
        word in analysis_text.lower()
        for word in ["price", "electricity", "prezz", "tariff", "hour"]
    )
    include_appliance_usage = any(
        word in analysis_text.lower()
        for word in ["appliance", "device", "lavatrice", "washing", "washer", "dispositivo", "hour"]
    )

    current_state = {
        "fotovoltaico": runtime.state.get("fotovoltaico", "1,10"),
        "batteria": runtime.state.get("batteria", "0,20"),
        "rete": runtime.state.get("rete", "0,30"),
        "consumption": runtime.state.get("consumption", "2,40"),
        "selfPercent": runtime.state.get("selfPercent", 78),
        "temperature": runtime.state.get("temperature", "29°C"),
        "devices": runtime.state.get("devices") or [
            {"name": "Doccia", "value": "+250 Wh"},
            {"name": "Lavatrice", "value": "+300 Wh"},
        ],
        "weeklyConsumption": weekly_consumption,
        "weeklyProduction": weekly_production,
        "applianceStats": appliance_stats,
        "energyPrices": energy_prices if include_prices else [],
        "energyPriceCurrency": "EUR/kWh",
        "applianceHourlyUsage": (
            [
                item
                for item in appliance_hourly_usage
                if item.get("wh", 0) > 0
            ][:200]
            if include_appliance_usage
            else []
        ),
        "applianceUsageUnit": "Wh",
        "dashboardOverrides": runtime.state.get("dashboardOverrides", {}),
    }

    requested_type = _requested_chart_type(analysis_text)
    topic = _requested_consumption_topic(analysis_text)
    language_instruction = _reply_language_instruction(intent_text, previous_user_text)

    if not _looks_like_layout_request(analysis_text):
        fallback_overrides = _fallback_dashboard_overrides(
            analysis_text,
            weekly_consumption,
            weekly_production,
            appliance_stats,
            energy_prices,
            appliance_hourly_usage,
            current_state,
        )
        if requested_type is not None or topic != "consumption":
            return _fallback_command(
                runtime,
                fallback_overrides,
                "deterministic chart selection",
                language_instruction,
            )

    prompt = f"""
You are designing a compact Edison My Sun dashboard view for a mobile app.

Audience:
- A homeowner checking solar performance quickly.
- They want clear energy insight, not technical implementation details.

Design intent:
- Choose the simplest visualization that answers the user's request.
- If the latest user message is only an affirmation such as "yes", "yes please",
  "show it", or "show it visually", infer the visualization topic from the
  immediately previous factual user question and assistant answer.
- If the user names a chart type, honor that chart type even if another visual
    would also make sense.
- Prefer a bar chart for week-over-week or day-by-day consumption questions.
- Prefer a line chart for weekly or daily trends over time.
- Prefer a line chart of daily minimum prices for "cheapest this week" or
  "energy prices from the last week" questions, so the whole week is visible on
  mobile.
- Prefer a line chart for hourly energy prices only when the user asks for a
  specific day or explicitly asks for hourly detail.
- Prefer a stackedBar chart for daily source breakdowns, such as solar,
    battery, and grid contribution by day.
- Prefer a pie chart for source split or self-consumption share when the user
    wants a composition view.
- Prefer a gauge only when the user is explicitly asking for a percentage-style
    self-consumption summary or no stronger chart shape is implied.
- Prefer cards/lists for appliance status and usage counts.
- Prefer line or stackedBar charts for hourly appliance usage.
- Keep the existing dashboard calm, readable, and mobile friendly.

CURRENT STATE:
{json.dumps(current_state, indent=2)}

CURRENT DASHBOARD OVERRIDES:
{json.dumps(current_state.get("dashboardOverrides", {}), indent=2)}

Return VALID JSON only. Do not include markdown, explanations, or code fences.

Available keys:

1. "metrics" - raw values:
{{
  "fotovoltaico": "3,50",
  "batteria": "0,50",
  "rete": "0,10",
  "consumption": "2,40",
  "selfPercent": 85,
  "temperature": "31°C"
}}

2. "dashboardOverrides" - layout and visual sections:
{{
  "sections": ["metrics", "consumption", "devices"],
  "consumption": {{
    "type": "card" | "pie" | "bar" | "line" | "stackedBar" | "gauge",
    "title": "string",
    "kwh": "2,40",
    "selfPercent": 78,
    "value": 78,
    "color": "#hex",
    "data": [{{"label": "string", "value": 1.1, "color": "#hex"}}],
    "series": [{{"key": "value", "label": "string", "color": "#hex"}}]
  }},
  "metrics": {{
    "type": "grid" | "pie" | "bar" | "line" | "stackedBar" | "gauge",
    "title": "string",
    "color": "#hex",
    "value": 78,
    "data": [{{"label": "string", "value": 1.1, "color": "#hex"}}],
    "series": [{{"key": "value", "label": "string", "color": "#hex"}}]
  }},
  "devices": {{
    "visible": true
  }}
}}

Rules:
- Merge dashboardOverrides with the existing object. Do not wipe unrelated keys.
- Exception: if the user asks to reset, set dashboardOverrides to {{}}.
- Keep the default section order ["metrics", "consumption", "devices"] unless
  the user explicitly asks to reorder, hide, or show only certain sections.
- When generating a chart, replace the relevant section in place. Do not move
  the chart above the energy metric labels unless the user asks for that.
- If an old chart is already present, replace it with the new requested chart.
  For example, if the current consumption view is a gauge but the previous
  user question was weekly consumption, output a new consumption object with
  type="bar" or type="line"; do not keep the gauge.
- UI labels and chart labels stay Italian: Fotovoltaico, Batteria, Rete,
  Consumo, Lavatrice, Doccia.
- Use Italian number formatting in UI values, such as "3,50".
- Colors: green=#22c55e, orange=#f97316, blue=#3b82f6, gray=#6b7280.
- For weekly line or bar charts, use weekday labels from weeklyConsumption or
  weeklyProduction. Convert Italian decimal strings to JSON numbers for
  "value" fields, e.g. "2,10" becomes 2.1.
- For weekly energy price visuals, include one point for each day of the week
  using the lowest hourly energyPrices value from that day. Do not show only
  Tuesday and Wednesday or only the first 48 hourly prices.
- Data items must always be complete objects:
  {{"label": "Monday", "value": 2.1, "color": "#22c55e"}}
- For stackedBar charts, data items contain multiple numeric keys, and series
  describes those keys:
  {{
    "label": "Monday",
    "fotovoltaico": 1.2,
    "batteria": 0.3,
    "rete": 0.6
  }}
- For gauge charts, set type="gauge", value=selfPercent, title="Autoconsumo".
- Do not invent values. Use current state only.

Examples:

"Show energy as a pie chart"
-> {{"dashboardOverrides": {{"consumption": {{"type": "pie", "title": "Consumo Energetico", "data": [...]}}}}}}

"Generate a weekly consumption chart"
-> {{"dashboardOverrides": {{"sections": ["metrics", "consumption", "devices"], "consumption": {{"type": "bar", "title": "Consumo settimanale", "data": [{{"label": "Monday", "value": 2.1, "color": "#22c55e"}}]}}}}}}

"Yes" after "Show me my consumption this week"
-> {{"dashboardOverrides": {{"sections": ["metrics", "consumption", "devices"], "consumption": {{"type": "bar", "title": "Consumo settimanale", "data": [{{"label": "Monday", "value": 2.1, "color": "#22c55e"}}]}}}}}}

"Yes" after "How much energy did I produce this week?"
-> {{"dashboardOverrides": {{"sections": ["metrics", "consumption", "devices"], "consumption": {{"type": "line", "title": "Produzione settimanale", "data": [{{"label": "Monday", "value": 4.2, "color": "#22c55e"}}]}}}}}}

"Show my weekly consumption trend"
-> {{"dashboardOverrides": {{"sections": ["metrics", "consumption", "devices"], "consumption": {{"type": "line", "title": "Andamento consumi", "data": [{{"label": "Monday", "value": 2.1, "color": "#22c55e"}}]}}}}}}

"Show daily source breakdown as a stacked bar chart"
-> {{"dashboardOverrides": {{"sections": ["metrics", "consumption", "devices"], "consumption": {{"type": "stackedBar", "title": "Fonti energetiche", "data": [{{"label": "Monday", "fotovoltaico": 1.2, "batteria": 0.3, "rete": 0.6}}], "series": [{{"key": "fotovoltaico", "label": "Fotovoltaico", "color": "#22c55e"}}, {{"key": "batteria", "label": "Batteria", "color": "#3b82f6"}}, {{"key": "rete", "label": "Rete", "color": "#f97316"}}]}}}}}}

"Show self consumption as a gauge"
-> {{"dashboardOverrides": {{"sections": ["metrics", "consumption", "devices"], "consumption": {{"type": "gauge", "title": "Autoconsumo", "value": 78, "color": "#22c55e"}}}}}}

"Show self consumption as a bar chart"
-> {{"dashboardOverrides": {{"sections": ["metrics", "consumption", "devices"], "consumption": {{"type": "bar", "title": "Autoconsumo settimanale", "data": [{{"label": "Monday", "value": 2.1, "color": "#22c55e"}}]}}}}}}

"Show only the consumption chart"
-> {{"dashboardOverrides": {{"sections": ["consumption"], "consumption": {{"type": "bar", "title": "Consumo settimanale", "data": [{{"label": "Monday", "value": 2.1, "color": "#22c55e"}}]}}}}}}

"Swap consumption and metrics"
-> {{"dashboardOverrides": {{"sections": ["consumption", "metrics", "devices"]}}}}

"Hide devices"
-> {{"dashboardOverrides": {{"sections": ["metrics", "consumption"]}}}}

"Reset everything"
-> {{"dashboardOverrides": {{}}}}
"""

    model = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        model_kwargs={"parallel_tool_calls": False},
    )
    fallback_overrides = _fallback_dashboard_overrides(
        intent_text,
        weekly_consumption,
        weekly_production,
        appliance_stats,
        energy_prices,
        appliance_hourly_usage,
        current_state,
    )
    try:
        response = model.invoke([SystemMessage(content=prompt), *messages])
    except RateLimitError as e:
        print(f"[generate_a2ui] rate limit: {e}")
        return _fallback_command(runtime, fallback_overrides, "model rate limit", language_instruction)
    except Exception as e:
        print(f"[generate_a2ui] model error: {e}")
        return _fallback_command(runtime, fallback_overrides, "model error", language_instruction)

    try:
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())
    except Exception as e:
        print(f"[generate_a2ui] parse error: {e}\nraw: {response.content}")
        return _fallback_command(runtime, fallback_overrides, "model response parse error", language_instruction)

    update: dict = {}

    metrics = result.get("metrics", {})
    for key in [
        "fotovoltaico",
        "batteria",
        "rete",
        "consumption",
        "selfPercent",
        "temperature",
    ]:
        if key in metrics:
            update[key] = metrics[key]

    if "dashboardOverrides" in result and result["dashboardOverrides"] == {}:
        update["dashboardOverrides"] = {}
    elif "dashboardOverrides" in result:
        existing = current_state.get("dashboardOverrides", {})
        update["dashboardOverrides"] = {**existing, **result["dashboardOverrides"]}

    summary_parts = []
    if "dashboardOverrides" in update:
        changed = list(update["dashboardOverrides"].keys())
        summary_parts.append(
            f"prepared dashboard preview: {changed}" if changed else "reset dashboard view"
        )
    for key in [
        "fotovoltaico",
        "batteria",
        "rete",
        "consumption",
        "selfPercent",
        "temperature",
    ]:
        if key in update:
            summary_parts.append(f"{key} -> {update[key]}")

    summary = (
        f"Dashboard preview prepared: {', '.join(summary_parts)}."
        if summary_parts
        else "No dashboard changes were needed."
    )
    summary += (
        f" {language_instruction} Final user-facing response must tell the user "
        "the preview is ready and they can accept or decline it. Do not ask "
        "whether they want to visualize it. Keep it warm and concise. Do not "
        "mention JSON, code, tools, or implementation details."
    )

    update["messages"] = [
        ToolMessage(
            content=summary,
            tool_call_id=runtime.tool_call_id,
        )
    ]

    return Command(update=update)
