import { createContext, useContext, useReducer } from 'react';

const AppContext = createContext(null);

const initialState = {
    currentStep: 0, // 0=landing, 1=identify, 2=reflect, 3=practice, 4=summary
    scenario: {
        description: '',
        selfName: '',
        otherName: '',
        relationship: '',
    },
    screenshotData: null,      // extracted messages from screenshot
    selfAnswers: [],
    otherAnswers: [],
    assessment: null,
    conflictStyles: null,      // compatibility alias for assessment results
    dialogue: null,            // LLM-generated dialogue
    annotations: {},           // user's annotations { lineIdx: behaviorType }
    annotationResults: null,   // accuracy results from annotation check
    reflections: [],           // user's reflection notes
    practice: { attempts: [] },
    practiceAttempts: [],      // { original, rewrite, feedback }
    roleplayHistory: [],       // roleplay conversation history
    summary: null,             // LLM-generated summary report
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_SCENARIO':
            return { ...state, scenario: { ...state.scenario, ...action.payload } };
        case 'SET_SCREENSHOT_DATA':
            return { ...state, screenshotData: action.payload };
        case 'SET_SELF_ANSWERS':
            return { ...state, selfAnswers: action.payload };
        case 'SET_OTHER_ANSWERS':
            return { ...state, otherAnswers: action.payload };
        case 'SET_ASSESSMENT':
        case 'SET_CONFLICT_STYLES':
            return {
                ...state,
                assessment: action.payload,
                conflictStyles: action.payload,
            };
        case 'SET_DIALOGUE':
            return { ...state, dialogue: action.payload };
        case 'SET_ANNOTATION':
            return { ...state, annotations: { ...state.annotations, [action.payload.idx]: action.payload.label } };
        case 'SET_ALL_ANNOTATIONS':
            return { ...state, annotations: action.payload };
        case 'SET_ANNOTATION_RESULTS':
            return { ...state, annotationResults: action.payload };
        case 'ADD_REFLECTION':
            return { ...state, reflections: [...state.reflections, action.payload] };
        case 'SET_PRACTICE':
            return {
                ...state,
                practice: action.payload,
                practiceAttempts: action.payload?.attempts || [],
            };
        case 'ADD_PRACTICE_ATTEMPT': {
            const nextAttempts = [...state.practiceAttempts, action.payload];
            return {
                ...state,
                practiceAttempts: nextAttempts,
                practice: { attempts: nextAttempts },
            };
        }
        case 'ADD_ROLEPLAY_MESSAGE':
            return { ...state, roleplayHistory: [...state.roleplayHistory, action.payload] };
        case 'RESET_ROLEPLAY':
            return { ...state, roleplayHistory: action.payload || [] };
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
