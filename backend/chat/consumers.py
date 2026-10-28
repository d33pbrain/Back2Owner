# chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        self.user = self.scope.get('user', AnonymousUser())
        print(f"DEBUG WS USER: {self.user} (Authenticated: {getattr(self.user, 'is_authenticated', False)})")

        if not self.user.is_authenticated:
            print("DEBUG WS REJECT: User is not authenticated!")
            await self.close()
            return

        is_participant = await self.check_participant()
        print(f"DEBUG WS IS PARTICIPANT: {is_participant}")

        if not is_participant:
            print("DEBUG WS REJECT: User is not a participant in this conversation!")
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        content = data.get('content', '').strip()

        if not content:
            return

        # Save message to database
        message = await self.save_message(content)

        # Broadcast message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message_id': str(message.id),
                'sender_id': str(self.user.id),
                'sender_name': self.user.full_name,
                'content': message.content,
                'message_type': message.message_type,
                'created_at': message.created_at.isoformat(),
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'id': event['message_id'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'content': event['content'],
            'message_type': event['message_type'],
            'created_at': event['created_at'],
            'is_me': event['sender_id'] == str(self.user.id),
        }))

    @database_sync_to_async
    def check_participant(self):
        return Conversation.objects.filter(id=self.conversation_id, participants=self.user).exists()

    @database_sync_to_async
    def save_message(self, content):
        conversation = Conversation.objects.get(id=self.conversation_id)
        msg = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            content=content,
            message_type=Message.MessageType.TEXT
        )
        conversation.save()
        return msg