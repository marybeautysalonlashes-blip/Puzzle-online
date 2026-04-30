import React, { useState, useEffect } from 'react';

const JokeGenerator = () => {
    const [joke, setJoke] = useState('');

    const fetchJoke = async () => {
        try {
            const response = await fetch('https://official-joke-api.appspot.com/jokes/random');
            const data = await response.json();
            setJoke(`${data.setup} - ${data.punchline}`);
        } catch (error) {
            console.error('Error fetching joke:', error);
        }
    };

    useEffect(() => {
        fetchJoke();
    }, []);

    return (
        <div>
            <h1>Joke of the Day</h1>
            <p>{joke}</p>
            <button onClick={fetchJoke}>Generate New Joke</button>
        </div>
    );
};

export default JokeGenerator;