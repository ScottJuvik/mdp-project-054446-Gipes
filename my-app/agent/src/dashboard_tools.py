from langchain_core.messages import ToolMessage
from langgraph.types import Command
from langchain.agents import AgentState as BaseAgentState
from langchain.tools import ToolRuntime, tool
from typing import TypedDict
from datetime import datetime, timedelta
import uuid


class Device(TypedDict):
    id: str
    name: str
    value: str


class DailyEnergy(TypedDict):
    day: str
    kwh: str


class ApplianceStat(TypedDict):
    name: str
    active: bool
    consumed: str
    weeklyUses: int


class EnergyPrice(TypedDict):
    timestamp: str
    day: str
    hour: str
    eurPerKwh: float


class ApplianceHourlyUsage(TypedDict):
    timestamp: str
    day: str
    hour: str
    appliance: str
    wh: int


class AgentState(BaseAgentState):
    hasInverter: bool
    fotovoltaico: str
    batteria: str
    rete: str
    consumption: str
    selfPercent: int
    temperature: str
    devices: list[Device]
    weeklyConsumption: list[DailyEnergy]
    weeklyProduction: list[DailyEnergy]
    applianceStats: list[ApplianceStat]
    energyPrices: list[EnergyPrice]
    applianceHourlyUsage: list[ApplianceHourlyUsage]
    dashboardOverrides: dict  # drives chart/layout changes in InverterDashboard


def _mock_energy_prices() -> list[EnergyPrice]:
    start = datetime(2026, 5, 26)
    prices: list[EnergyPrice] = []

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
            price = round(base + weekend_discount + daily_variation + hour_variation, 3)

            prices.append(
                {
                    "timestamp": day.replace(hour=hour).isoformat(),
                    "day": day.strftime("%A"),
                    "hour": f"{hour:02d}:00",
                    "eurPerKwh": price,
                }
            )

    return prices


def _mock_appliance_hourly_usage() -> list[ApplianceHourlyUsage]:
    start = datetime(2026, 5, 26)
    appliances = ["Lavatrice", "Doccia", "Lavastoviglie", "Forno", "Frigorifero"]
    usage: list[ApplianceHourlyUsage] = []

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


@tool
def update_dashboard(
    hasInverter: bool = None,
    fotovoltaico: str = None,
    batteria: str = None,
    rete: str = None,
    consumption: str = None,
    selfPercent: int = None,
    temperature: str = None,
    devices: list[Device] = None,
    weeklyConsumption: list[DailyEnergy] = None,
    weeklyProduction: list[DailyEnergy] = None,
    applianceStats: list[ApplianceStat] = None,
    energyPrices: list[EnergyPrice] = None,
    applianceHourlyUsage: list[ApplianceHourlyUsage] = None,
    dashboardOverrides: dict = None,
    runtime: ToolRuntime = None,
) -> Command:
    """
    Update the Edison solar dashboard state.

    Use this to:
    - Show the dashboard: set hasInverter=True
    - Update solar power: set fotovoltaico e.g. "3,50"
    - Update battery: set batteria e.g. "0,50"
    - Update grid: set rete e.g. "0,10"
    - Update consumption: set consumption e.g. "2,40"
    - Update self consumption percent: set selfPercent e.g. 85
    - Update temperature: set temperature e.g. "35°C"
    - Add/remove devices: set devices list
    - Change chart layout: set dashboardOverrides with keys 'consumption' and/or 'metrics',
      each being {type, title, data, color} to change chart display.
      Example: {"consumption": {"type": "pie", "data": [...]}}
    """
    update = {}

    if hasInverter is not None:
        update["hasInverter"] = hasInverter
    if fotovoltaico is not None:
        update["fotovoltaico"] = fotovoltaico
    if batteria is not None:
        update["batteria"] = batteria
    if rete is not None:
        update["rete"] = rete
    if consumption is not None:
        update["consumption"] = consumption
    if selfPercent is not None:
        update["selfPercent"] = selfPercent
    if temperature is not None:
        update["temperature"] = temperature
    if devices is not None:
        update["devices"] = devices
    if weeklyConsumption is not None:
        update["weeklyConsumption"] = weeklyConsumption
    if weeklyProduction is not None:
        update["weeklyProduction"] = weeklyProduction
    if applianceStats is not None:
        update["applianceStats"] = applianceStats
    if energyPrices is not None:
        update["energyPrices"] = energyPrices
    if applianceHourlyUsage is not None:
        update["applianceHourlyUsage"] = applianceHourlyUsage
    if dashboardOverrides is not None:
        update["dashboardOverrides"] = dashboardOverrides

    update["messages"] = [
        ToolMessage(
            content=(
                "Dashboard updated successfully. Final user-facing response "
                "must be in the same language as the latest user message, "
                "not Italian unless the user wrote Italian."
            ),
            tool_call_id=runtime.tool_call_id,
        )
    ]

    return Command(update=update)


@tool
def get_dashboard(runtime: ToolRuntime) -> dict:
    """
    Get the current Edison dashboard state.
    Always call this before making changes so you know the current values.
    """
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
        {
            "name": "Lavatrice",
            "active": True,
            "consumed": "1.2 kWh",
            "weeklyUses": 4,
        },
        {
            "name": "Doccia",
            "active": True,
            "consumed": "250 Wh",
            "weeklyUses": 7,
        },
    ]
    energy_prices = runtime.state.get("energyPrices") or _mock_energy_prices()
    appliance_hourly_usage = (
        runtime.state.get("applianceHourlyUsage") or _mock_appliance_hourly_usage()
    )

    return {
        "hasInverter": runtime.state.get("hasInverter", False),
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
        "weeklyConsumptionTotal": "17,65",
        "weeklyProduction": weekly_production,
        "weeklyProductionTotal": "31,00",
        "applianceStats": appliance_stats,
        "energyPrices": energy_prices,
        "energyPriceCurrency": "EUR/kWh",
        "applianceHourlyUsage": appliance_hourly_usage,
        "applianceUsageUnit": "Wh",
        "dashboardOverrides": runtime.state.get("dashboardOverrides", {}),
    }


edison_tools = [
    update_dashboard,
    get_dashboard,
]
