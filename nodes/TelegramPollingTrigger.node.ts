import {ITriggerFunctions} from 'n8n-core';
import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import {
	ApiResponse,
	Update,
} from 'typegram';

export class TelegramPollingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Telegram Trigger (long polling)',
		name: 'telegramPollingTrigger',
		icon: 'file:telegram.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow on a Telegram update via long polling',
		defaults: {
			name: 'Telegram Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'telegramApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Updates',
				name: 'updates',
				type: 'multiOptions',
				options: [
					{
						name: '*',
						value: '*',
						description: 'All updates',
					},
					{
						name: 'Message',
						value: 'message',
						description: 'Trigger on new incoming message of any kind — text, photo, sticker, etc',
					},
					{
						name: 'Edited Message',
						value: 'edited_message',
						description: 'Trigger on new version of a channel post that is known to the bot and was edited',
					},
					{
						name: 'Channel Post',
						value: 'channel_post',
						description: 'Trigger on new incoming channel post of any kind — text, photo, sticker, etc',
					},
					{
						name: 'Edited Channel Post',
						value: 'edited_channel_post',
						description: 'Trigger on new version of a channel post that is known to the bot and was edited',
					},
					{
						name: 'Inline Query',
						value: 'inline_query',
						description: 'Trigger on new incoming inline query',
					},
					{
						name: 'Chosen Inline Result',
						value: 'chosen_inline_result',
						description: 'Trigger on the result of an inline query that was chosen by a user and sent to their chat partner',
					},
					{
						name: 'Callback Query',
						value: 'callback_query',
						description: 'Trigger on new incoming callback query',
					},
					{
						name: 'Shipping Query',
						value: 'shipping_query',
						description: 'Trigger on new incoming shipping query. Only for invoices with flexible price.',
					},
					{
						name: 'Pre-Checkout Query',
						value: 'pre_checkout_query',
						description: 'Trigger on new incoming pre-checkout query. Contains full information about checkout',
					},
					{
						name: 'Poll',
						value: 'poll',
						description: 'Trigger on new poll state. Bots receive only updates about stopped polls and polls, which are sent by the bot',
					},
					{
						name: 'Poll Answer',
						value: 'poll_answer',
						description: 'Trigger on new poll answer. Bots receive only updates about stopped polls and polls, which are sent by the bot',
					},
					{
						name: 'Bot Chat Member updated',
						value: 'my_chat_member',
						description: 'Trigger on the bot\'s chat member status was updated in a chat. For private chats, this update is received only when the bot is blocked or unblocked by the user',
					},
					{
						name: 'User Chat Member updated',
						value: 'chat_member',
						description: 'Trigger on the user chat member status was updated in a chat. The bot must be an administrator in the chat and must explicitly specify “chat_member” in the list of allowed_updates to receive these updates',
					},
					{
						name: 'Chat Join Request',
						value: 'chat_join_request',
						description: 'Trigger on a request to join the chat has been sent. The bot must have the can_invite_users administrator right in the chat to receive these updates',
					},
				],
				required: true,
				default: [],
				description: 'The update types to listen to',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 100,
				description: 'Limit the number of messages to be polled.',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 60,
				description: 'Timeout (in seconds) for the polling request.',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('telegramApi');

		const limit = this.getNodeParameter('limit') as number;
		const timeout = this.getNodeParameter('timeout') as number;

		let allowedUpdates = this.getNodeParameter('updates') as string[];

		if (allowedUpdates.includes('*')) {
			allowedUpdates = [] as string[];
		}

		let isPolling = true;

		const abortController = new AbortController();

		const startPolling = async () => {
			let offset = 0;

			while (isPolling) {
				const response = await this.helpers.request({
					method: 'post',
					uri: `https://api.telegram.org/bot${credentials.accessToken}/getUpdates`,
					body: {
						offset,
						limit,
						timeout,
						allowed_updates: allowedUpdates,
					},
					json: true,
					timeout: 0,
					signal: abortController.signal,
				}) as ApiResponse<Update[]>;

				if (!response.ok || !response.result) {
					continue;
				}

				let updates = response.result;
				if (updates.length > 0) {
					offset = updates[updates.length - 1].update_id + 1;

					if (allowedUpdates.length > 0) {
						updates = updates.filter(update => Object.keys(update).some(x => allowedUpdates.includes(x)));
					}

					this.emit([
						updates.map(update => ({json: update as unknown as IDataObject})),
					]);
				}
			}
		};

		startPolling();

		const closeFunction = async () => {
			isPolling = false;
			abortController.abort();
		};

		return {
			closeFunction,
		};
	}
}
