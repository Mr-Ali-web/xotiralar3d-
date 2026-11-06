import asyncio
import os
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN")
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://example.com")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def start(message: types.Message):
    kb = types.InlineKeyboardMarkup(inline_keyboard=[[
        types.InlineKeyboardButton(text="3D Xonalarni ochish", web_app=types.WebAppInfo(url=MINI_APP_URL))
    ]])
    await message.answer("Xush kelibsiz! 3D xonalarni ochish uchun tugmani bosing.", reply_markup=kb)

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
