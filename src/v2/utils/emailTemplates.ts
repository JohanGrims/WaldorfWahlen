export const V2_EMAIL_TEMPLATES = {
  announcement: {
    subject: "Wählen: {{title}}",
    body: `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neue Wahl – WaldorfWahlen</title>
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background-color: #F5F5F5;
            padding: 24px;
            display: flex;
            justify-content: center;
        }
        .container {
            max-width: 600px;
            background: #FFFFFF;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            text-align: left;
        }
        h3 {
            font-size: 24px;
            font-weight: 500;
            margin-bottom: 16px;
            color: #333;
        }
        p {
            color: #424242;
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 16px;
        }
        .button {
            display: inline-block;
            background: #f89e24;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 9999px;
            font-size: 16px;
            font-weight: 500;
            text-align: center;
            margin-top: 16px;
            transition: background 0.3s;
        }
        .button:hover {
            background: #d8801b;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #757575;
        }
        .link-box {
            margin-top: 12px;
            padding: 12px;
            background: #F5F5F5;
            border-radius: 8px;
            font-size: 14px;
            word-wrap: break-word;
            color: #333;
        }
        strong {
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h3>Neue Wahl: {{title}}</h3>
        <p>Liebe/r {{name}},</p>
        <p>es ist eine neue Wahl verfügbar: <strong>{{title}}</strong></p>
        <p>Bitte besuchen Sie die folgende Website, um Ihre Stimme abzugeben:</p>
        <p style="text-align: center;">
            <a href="{{link}}" class="button">Jetzt pseudonymisiert wählen</a>
        </p>
        <p><strong>Direktlink:</strong></p>
        <p class="link-box">{{link}}</p>
        <p class="footer">Mit freundlichen Grüßen!</p>
    </div>
</body>
</html>`,
  },
  reminder: {
    subject: "Erinnerung: {{title}}",
    body: `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erinnerung – WaldorfWahlen</title>
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background-color: #F5F5F5;
            padding: 24px;
            display: flex;
            justify-content: center;
        }
        .container {
            max-width: 600px;
            background: #FFFFFF;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            text-align: left;
        }
        h3 {
            font-size: 24px;
            font-weight: 500;
            margin-bottom: 16px;
            color: #333;
        }
        p {
            color: #424242;
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 16px;
        }
        .button {
            display: inline-block;
            background: #f89e24;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 9999px;
            font-size: 16px;
            font-weight: 500;
            text-align: center;
            margin-top: 16px;
            transition: background 0.3s;
        }
        .button:hover {
            background: #d8801b;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #757575;
        }
        .link-box {
            margin-top: 12px;
            padding: 12px;
            background: #F5F5F5;
            border-radius: 8px;
            font-size: 14px;
            word-wrap: break-word;
            color: #333;
        }
        strong {
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h3>Erinnerung: {{title}}</h3>
        <p>Liebe/r {{name}},</p>
        <p>Sie haben noch nicht an der Wahl <strong>{{title}}</strong> teilgenommen.</p>
        <p>Bitte vergessen Sie nicht, Ihre Stimme abzugeben:</p>
        <p style="text-align: center;">
            <a href="{{link}}" class="button">Jetzt pseudonymisiert wählen</a>
        </p>
        <p>Falls Sie diese E-Mail unerwartet erhalten haben, ignorieren Sie diese Nachricht einfach.</p>
        <p><strong>Direktlink:</strong></p>
        <p class="link-box">{{link}}</p>
        <p class="footer">Mit freundlichen Grüßen!</p>
    </div>
</body>
</html>`,
  }
};
