import React from 'react';
import moment from 'moment-timezone';
import 'moment/locale/de'; // Ensure German locale is loaded

// Placeholder for mdui-card or similar if it's not a standard HTML element.
// If mdui-card is a custom element, ensure it's used correctly.
// For navigation, ideally use Link from react-router-dom if appropriate,
// otherwise a simple href.

const VoteCard = ({ id, title, endTime }) => {
  const formattedEndTime = moment.unix(endTime.seconds).tz("Europe/Berlin").locale("de").format("dddd, D. MMMM YYYY, HH:mm");

  return (
    <a href={`/${id}`} style={{ textDecoration: 'none', display: 'flex', height: '100%' }}>
      <mdui-card 
        clickable 
        variant="elevated"
        style={{ 
          margin: '0', // Margin handled by carousel gap
          padding: '16px', 
          minWidth: '280px', 
          width: '100%', // Allow card to take width from parent in carousel
          maxWidth: '320px', 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexGrow: 1, // Allow card to grow if space available
          height: '100%' // Ensure cards in a row have same height
        }}
      >
        <div>
          <h3 style={{ marginTop: '0', marginBottom: '8px', fontSize: '1.25em' }}>{title}</h3>
          <p style={{ fontSize: '0.9em', color: '#555' }}>Endet am {formattedEndTime}</p>
        </div>
      </mdui-card>
    </a>
  );
};

export default VoteCard;
