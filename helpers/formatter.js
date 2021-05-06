const phoneNumberFormatter = function(number) {
    //1 menghilangkan char selain angka
    let formatted = number.replace(/\D/g, '');

    //2 menjadikan format international
    if (formatted.startsWith('0')){
        formatted = '62' + formatted.substr(1);
    }

    //3 menambahkan format nomor whatsapp
    if(!formatted.endsWith('@c.us')){
        formatted +='@c.us';
    }

    return formatted;

}

module.exports = {
    phoneNumberFormatter
}