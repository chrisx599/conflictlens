import { createContext, useContext, useReducer } from 'react';

const AppContext = createContext(null);

const initialState = {
    currentStep: 0, // 0=landing, 1=identify, 2=reflect, 3=practice, 4=summary
    scenario: {
        description: '',
        selfName: '',
        otherName: '',
        relationshipType: '',
    },
    selfAnswers: [],
    otherAnswers: [],
    conflictStyles: null,     // LLM response from assessment
    dialogue: null,           // LLM-generated dialogue
    reflections: [],          // user's reflection notes
    practiceAttempts: [],     // { original, rewrite, feedback }
    summary: null,            // LLM-generated summary report
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_SCENARIO':
            return { ...state, scenario: { ...state.scenario, ...action.payload } };
        case 'SET_SELF_ANSWERS':
            return { ...state, selfAnswers: action.payload };
        case 'SET_OTHER_ANSWERS':
            return { ...state, otherAnswers: action.payload };
        case 'SET_CONFLICT_STYLES':
            return { ...state, conflictStyles: action.payload };
        case 'SET_DIALOGUE':
            return { ...state, dialogue: action.payload };
        case 'ADD_REFLECTION':
            return { ...state, reflections: [...state.reflections, action.payload] };
        case 'ADD_PRACTICE_ATTEMPT':
            return { ...state, practiceAttempts: [...state.practiceAttempts, action.payload] };
        case 'SET_SUMMARY':
            return { ...state, summary: action.payload };
        case 'SET_STEP':
            return { ...state, currentStep: action.payload };
        case 'NEXT_STEP':
            return { ...state, currentStep: Math.min(state.currentStep + 1, 4) };
        case 'PREV_STEP':
            return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
        case 'RESET':
            return { ...initialState };
        default:
            return state;
    }
}

export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
