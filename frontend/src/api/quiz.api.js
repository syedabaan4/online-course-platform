import api from './axios';

export const getQuizByModule = async (moduleId) => {
	try {
		const response = await api.get(`/quizzes/module/${moduleId}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getQuizById = async (id) => {
	try {
		const response = await api.get(`/quizzes/${id}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const createQuiz = async (data) => {
	try {
		const response = await api.post('/quizzes', data);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const updateQuiz = async (id, data) => {
	try {
		const response = await api.put(`/quizzes/${id}`, data);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const publishQuiz = async (id) => {
	try {
		const response = await api.post(`/quizzes/${id}/publish`, {});
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const deleteQuiz = async (id) => {
	try {
		const response = await api.delete(`/quizzes/${id}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const addQuestion = async (quizId, data) => {
	try {
		const response = await api.post(`/quizzes/${quizId}/questions`, data);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const updateQuestion = async (questionId, data) => {
	try {
		const response = await api.put(`/quizzes/questions/${questionId}`, data);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const deleteQuestion = async (questionId) => {
	try {
		const response = await api.delete(`/quizzes/questions/${questionId}`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const submitAttempt = async (quizId, answers) => {
	try {
		const response = await api.post(`/quizzes/${quizId}/attempt`, { answers });
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};

export const getMyAttempts = async (quizId) => {
	try {
		const response = await api.get(`/quizzes/${quizId}/attempts/my`);
		return response.data;
	} catch (error) {
		throw error.response?.data?.error || error.message;
	}
};
